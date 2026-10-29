from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.grading import grade_answer
from app.models import Answer, Attempt, AuditLog, Examination, ExaminationQuestion, Question, User, UserRole
from app.schemas import AnswerSave, AnswerResult, AttemptResult, ReviewRequest
from app.timeutils import as_utc

router = APIRouter(prefix="/attempts", tags=["attempts and grading"])


def _owned_attempt(attempt_id: int, user: User, db: Session) -> Attempt:
    attempt = db.scalar(select(Attempt).where(Attempt.id == attempt_id).with_for_update())
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    exam = db.get(Examination, attempt.examination_id)
    if user.role == UserRole.student and attempt.student_id != user.id:
        raise HTTPException(status_code=403, detail="You may only access your own attempts")
    if user.role == UserRole.faculty and exam.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only access attempts for your examinations")
    return attempt


@router.put("/{attempt_id}/answers")
def save_answer(attempt_id: int, payload: AnswerSave, user: User = Depends(require_roles(UserRole.student)), db: Session = Depends(get_db)):
    attempt = _owned_attempt(attempt_id, user, db)
    if attempt.status != "in_progress":
        raise HTTPException(status_code=409, detail="This attempt has already been submitted")
    exam = db.get(Examination, attempt.examination_id)
    now = datetime.now(timezone.utc)
    deadline = min(as_utc(attempt.started_at) + timedelta(minutes=exam.duration_minutes), as_utc(exam.end_time))
    if now >= deadline:
        raise HTTPException(status_code=409, detail="The examination time limit has elapsed")
    in_exam = db.scalar(select(ExaminationQuestion).where(ExaminationQuestion.examination_id == exam.id, ExaminationQuestion.question_id == payload.question_id))
    if in_exam is None:
        raise HTTPException(status_code=404, detail="Question is not part of this examination")
    question = db.get(Question, payload.question_id)
    if payload.selected_option is not None and (question.type.value != "mcq" or payload.selected_option not in (question.options or [])):
        raise HTTPException(status_code=422, detail="Selected option is not valid for this question")
    answer = db.scalar(select(Answer).where(Answer.attempt_id == attempt.id, Answer.question_id == payload.question_id))
    if answer is None:
        answer = Answer(attempt_id=attempt.id, question_id=payload.question_id)
        db.add(answer)
    answer.answer_text = payload.answer_text
    answer.selected_option = payload.selected_option
    answer.marked_for_review = payload.marked_for_review
    db.commit()
    return {"saved": True, "saved_at": now}


@router.post("/{attempt_id}/submit", response_model=AttemptResult)
def submit_attempt(attempt_id: int, user: User = Depends(require_roles(UserRole.student)), db: Session = Depends(get_db)):
    attempt = _owned_attempt(attempt_id, user, db)
    if attempt.status != "in_progress":
        raise HTTPException(status_code=409, detail="This attempt has already been submitted")
    exam = db.scalar(select(Examination).options(selectinload(Examination.questions).selectinload(ExaminationQuestion.question)).where(Examination.id == attempt.examination_id))
    now = datetime.now(timezone.utc)
    started_at = as_utc(attempt.started_at)
    deadline = min(started_at + timedelta(minutes=exam.duration_minutes), as_utc(exam.end_time))
    question_by_id = {item.question_id: item.question for item in exam.questions}
    answers = {answer.question_id: answer for answer in db.scalars(select(Answer).where(Answer.attempt_id == attempt.id))}
    for question_id, question in question_by_id.items():
        answer = answers.get(question_id)
        if answer is None:
            answer = Answer(attempt_id=attempt.id, question_id=question_id)
            db.add(answer)
        grade_answer(answer, question, exam.negative_marking)
    attempt.status = "submitted"
    attempt.submitted_at = now
    attempt.time_spent_seconds = max(0, int((min(now, deadline) - started_at).total_seconds()))
    db.add(AuditLog(actor_id=user.id, action="exam_submit", entity_type="attempt", entity_id=attempt.id))
    db.commit()
    return _result(attempt, exam, db)


def _result(attempt: Attempt, exam: Examination, db: Session) -> AttemptResult:
    questions = {item.question_id: item.question for item in exam.questions}
    answer_rows = list(db.scalars(select(Answer).where(Answer.attempt_id == attempt.id)))
    order_list = attempt.question_order or [item.question_id for item in exam.questions]
    order_map = {qid: idx for idx, qid in enumerate(order_list)}
    answer_rows.sort(key=lambda a: order_map.get(a.question_id, 999999))
    answer_results = []
    for answer in answer_rows:
        q = questions.get(answer.question_id)
        if not q:
            continue
        answer_results.append(
            AnswerResult(
                question_id=answer.question_id,
                title=q.title,
                marks=q.marks,
                answer_text=answer.answer_text,
                selected_option=answer.selected_option,
                auto_score=round(answer.auto_score, 2) if answer.auto_score is not None else None,
                final_score=round(answer.final_score, 2) if answer.final_score is not None else None,
                confidence=answer.confidence,
                review_status=answer.review_status,
                feedback=answer.feedback,
            )
        )
    total_score = None if any(a.final_score is None for a in answer_rows) else round(sum(a.final_score or 0 for a in answer_rows), 2)
    return AttemptResult(
        attempt_id=attempt.id,
        examination_id=exam.id,
        examination_title=exam.title,
        subject_name=exam.subject.name if exam.subject else None,
        status=attempt.status,
        total_score=total_score,
        total_marks=round(sum(q.marks for q in questions.values()), 2),
        answers=answer_results,
    )


@router.get("/{attempt_id}/result", response_model=AttemptResult)
def get_result(attempt_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    attempt = _owned_attempt(attempt_id, user, db)
    if attempt.status != "submitted":
        raise HTTPException(status_code=409, detail="Results are available after submission")
    exam = db.scalar(select(Examination).options(selectinload(Examination.questions).selectinload(ExaminationQuestion.question)).where(Examination.id == attempt.examination_id))
    return _result(attempt, exam, db)


@router.get("/mine/results", response_model=list[AttemptResult])
def my_results(user: User = Depends(require_roles(UserRole.student)), db: Session = Depends(get_db)):
    attempts = list(db.scalars(
        select(Attempt).where(Attempt.student_id == user.id, Attempt.status == "submitted")
        .order_by(Attempt.submitted_at.desc()).limit(100)
    ))
    results = []
    for attempt in attempts:
        exam = db.scalar(
            select(Examination)
            .options(selectinload(Examination.questions).selectinload(ExaminationQuestion.question))
            .where(Examination.id == attempt.examination_id)
        )
        if exam is not None:
            results.append(_result(attempt, exam, db))
    return results


@router.get("/exam/{exam_id}/results")
def exam_results(
    exam_id: int,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    exam = db.scalar(
        select(Examination)
        .options(selectinload(Examination.questions).selectinload(ExaminationQuestion.question))
        .where(Examination.id == exam_id)
    )
    if exam is None:
        raise HTTPException(status_code=404, detail="Examination not found")
    if user.role == UserRole.faculty and exam.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only view results for your examinations")
    attempts = list(db.scalars(
        select(Attempt).where(Attempt.examination_id == exam.id, Attempt.status == "submitted")
        .order_by(Attempt.submitted_at.desc()).limit(500)
    ))
    results = []
    for attempt in attempts:
        result = _result(attempt, exam, db)
        student = db.get(User, attempt.student_id)
        results.append({
            **result.model_dump(),
            "student_id": attempt.student_id,
            "student_name": student.full_name if student else "Unknown student",
            "submitted_at": as_utc(attempt.submitted_at) if attempt.submitted_at else None,
        })
    return results


@router.get("/review-queue", response_model=list[AttemptResult])
def review_queue(user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)), db: Session = Depends(get_db)):
    query = select(Attempt).join(Examination, Attempt.examination_id == Examination.id).where(
        Attempt.status == "submitted",
        Attempt.id.in_(select(Answer.attempt_id).where(Answer.review_status == "faculty_review")),
    )
    if user.role == UserRole.faculty:
        query = query.where(Examination.created_by == user.id)
    attempts = list(db.scalars(query.order_by(Attempt.submitted_at.desc()).limit(200)))
    results = []
    for attempt in attempts:
        exam = db.scalar(select(Examination).options(selectinload(Examination.questions).selectinload(ExaminationQuestion.question)).where(Examination.id == attempt.examination_id))
        results.append(_result(attempt, exam, db))
    return results


@router.patch("/{attempt_id}/answers/{question_id}/review")
def review_answer(attempt_id: int, question_id: int, payload: ReviewRequest, user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)), db: Session = Depends(get_db)):
    attempt = _owned_attempt(attempt_id, user, db)
    answer = db.scalar(select(Answer).where(Answer.attempt_id == attempt.id, Answer.question_id == question_id))
    question = db.get(Question, question_id)
    if answer is None or question is None:
        raise HTTPException(status_code=404, detail="Answer not found")
    if payload.final_score > question.marks:
        raise HTTPException(status_code=422, detail="Score cannot exceed the question's maximum marks")
    answer.final_score = payload.final_score
    answer.feedback = payload.feedback
    answer.review_status = "reviewed"
    db.add(AuditLog(actor_id=user.id, action="score_override", entity_type="answer", entity_id=answer.id, details={"attempt_id": attempt.id, "question_id": question_id, "final_score": payload.final_score}))
    db.commit()
    return {"updated": True}
