import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Answer, Attempt, AuditLog, Examination, ExaminationQuestion, Question, User, UserRole
from app.schemas import ExamCreate, ExamRead
from app.timeutils import as_utc

router = APIRouter(prefix="/exams", tags=["examinations"])


def _read(exam: Examination) -> ExamRead:
    return ExamRead(
        id=exam.id,
        subject_id=exam.subject_id,
        subject_name=exam.subject.name if exam.subject else None,
        title=exam.title,
        description=exam.description,
        start_time=as_utc(exam.start_time),
        end_time=as_utc(exam.end_time),
        duration_minutes=exam.duration_minutes,
        attempt_limit=exam.attempt_limit,
        negative_marking=exam.negative_marking,
        is_published=exam.is_published,
        is_closed=exam.is_closed,
        created_by=exam.created_by,
        question_count=len(exam.questions),
    )


@router.get("", response_model=list[ExamRead])
def list_exams(
    subject_id: int | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Examination).options(selectinload(Examination.questions), joinedload(Examination.subject)).order_by(Examination.start_time)
    if isinstance(subject_id, int):
        query = query.where(Examination.subject_id == subject_id)
    if user.role == UserRole.student:
        query = query.where(Examination.is_published.is_(True), Examination.is_closed.is_(False))
    elif user.role == UserRole.faculty:
        query = query.where(Examination.created_by == user.id)
    return [_read(exam) for exam in db.scalars(query.limit(200))]


@router.get("/{exam_id}", response_model=ExamRead)
def get_exam(exam_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exam = db.scalar(select(Examination).options(selectinload(Examination.questions), joinedload(Examination.subject)).where(Examination.id == exam_id))
    if exam is None:
        raise HTTPException(status_code=404, detail="Examination not found")
    if user.role == UserRole.student and (not exam.is_published or exam.is_closed):
        raise HTTPException(status_code=404, detail="Examination not found")
    if user.role == UserRole.faculty and exam.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only view your own examinations")
    return _read(exam)


@router.post("", response_model=ExamRead, status_code=status.HTTP_201_CREATED)
def create_exam(payload: ExamCreate, user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)), db: Session = Depends(get_db)):
    if len(set(payload.question_ids)) != len(payload.question_ids):
        raise HTTPException(status_code=422, detail="Question IDs must be unique")
    questions = list(db.scalars(select(Question).where(Question.id.in_(payload.question_ids), Question.deleted_at.is_(None))))
    if len(questions) != len(payload.question_ids):
        raise HTTPException(status_code=422, detail="One or more questions do not exist")
    if user.role != UserRole.admin and any(question.created_by != user.id for question in questions):
        raise HTTPException(status_code=403, detail="Exams may only include questions from your question bank")
    exam_data = payload.model_dump(exclude={"question_ids"})
    exam = Examination(**exam_data, created_by=user.id)
    db.add(exam)
    db.flush()
    for position, question_id in enumerate(payload.question_ids):
        db.add(ExaminationQuestion(examination_id=exam.id, question_id=question_id, position=position))
    db.add(AuditLog(actor_id=user.id, action="exam_created", entity_type="examination", entity_id=exam.id))
    db.commit()
    db.refresh(exam)
    return _read(exam)


@router.patch("/{exam_id}/publish", response_model=ExamRead)
def publish_exam(exam_id: int, published: bool, user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)), db: Session = Depends(get_db)):
    exam = db.scalar(select(Examination).options(selectinload(Examination.questions)).where(Examination.id == exam_id))
    if exam is None:
        raise HTTPException(status_code=404, detail="Examination not found")
    if user.role != UserRole.admin and exam.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only manage your own examinations")
    if published and not exam.questions:
        raise HTTPException(status_code=422, detail="Add at least one question before publishing")
    exam.is_published = published
    db.add(AuditLog(actor_id=user.id, action="exam_published" if published else "exam_unpublished", entity_type="examination", entity_id=exam.id))
    db.commit()
    db.refresh(exam)
    return _read(exam)


@router.patch("/{exam_id}/close", response_model=ExamRead)
def close_exam(exam_id: int, user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)), db: Session = Depends(get_db)):
    exam = db.scalar(select(Examination).options(selectinload(Examination.questions)).where(Examination.id == exam_id))
    if exam is None:
        raise HTTPException(status_code=404, detail="Examination not found")
    if user.role != UserRole.admin and exam.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only manage your own examinations")
    exam.is_closed = True
    db.add(AuditLog(actor_id=user.id, action="exam_closed", entity_type="examination", entity_id=exam.id))
    db.commit()
    db.refresh(exam)
    return _read(exam)


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(exam_id: int, user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)), db: Session = Depends(get_db)):
    exam = db.get(Examination, exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Examination not found")
    if user.role != UserRole.admin and exam.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only delete your own examinations")
    has_attempts = db.scalar(select(Attempt.id).where(Attempt.examination_id == exam.id).limit(1))
    if has_attempts is not None:
        raise HTTPException(status_code=409, detail="Examinations with student attempts cannot be deleted. Close the examination instead.")
    db.delete(exam)
    db.add(AuditLog(actor_id=user.id, action="exam_deleted", entity_type="examination", entity_id=exam.id))
    db.commit()


@router.post("/{exam_id}/attempts", status_code=status.HTTP_201_CREATED)
def start_attempt(exam_id: int, user: User = Depends(require_roles(UserRole.student)), db: Session = Depends(get_db)):
    db.scalar(select(User).where(User.id == user.id).with_for_update())
    now = datetime.now(timezone.utc)
    exam = db.scalar(select(Examination).options(selectinload(Examination.questions).selectinload(ExaminationQuestion.question)).where(Examination.id == exam_id))
    if exam is None:
        raise HTTPException(status_code=404, detail="Examination is not available")
    active_attempt = db.scalar(select(Attempt).where(
        Attempt.student_id == user.id,
        Attempt.examination_id == exam.id,
        Attempt.status == "in_progress",
    ))
    if active_attempt is None and (not exam.is_published or exam.is_closed):
        raise HTTPException(status_code=404, detail="Examination is not available")
    exam_start = as_utc(exam.start_time)
    exam_end = as_utc(exam.end_time)
    if active_attempt is None and (now < exam_start or now >= exam_end):
        raise HTTPException(status_code=409, detail="Examination is outside its scheduled window")
    attempts = list(db.scalars(select(Attempt).where(Attempt.student_id == user.id, Attempt.examination_id == exam.id)))
    if active_attempt is None:
        if sum(attempt.status != "in_progress" for attempt in attempts) >= exam.attempt_limit:
            raise HTTPException(status_code=409, detail="Attempt limit reached")
        attempt = Attempt(student_id=user.id, examination_id=exam.id)
        db.add(attempt)
        db.flush()
        db.add(AuditLog(actor_id=user.id, action="exam_start", entity_type="attempt", entity_id=attempt.id))
    else:
        attempt = active_attempt
    started_at = as_utc(attempt.started_at)
    deadline = min(started_at + timedelta(minutes=exam.duration_minutes), exam_end)
    items = list(exam.questions)
    if not attempt.question_order:
        if exam.shuffle_questions:
            random.shuffle(items)
        attempt.question_order = [item.question_id for item in items]
    question_by_id = {item.question_id: item for item in items}
    if exam.shuffle_options and not attempt.option_orders:
        option_orders = {}
        for item in items:
            if item.question.type.value == "mcq":
                options = list(item.question.options or [])
                random.shuffle(options)
                option_orders[str(item.question_id)] = options
        attempt.option_orders = option_orders
    response_questions = []
    for question_id in attempt.question_order:
        item = question_by_id.get(question_id)
        if item is None:
            continue
        question = item.question
        options = (attempt.option_orders or {}).get(str(question.id), list(question.options or []))
        response_questions.append({
            "id": question.id, "title": question.title, "content": question.content,
            "type": question.type.value, "options": options, "marks": question.marks,
        })
    saved_answers = list(db.scalars(select(Answer).where(Answer.attempt_id == attempt.id)))
    db.commit()
    return {
        "attempt_id": attempt.id,
        "started_at": started_at,
        "deadline": deadline,
        "duration_minutes": exam.duration_minutes,
        "questions": response_questions,
        "answers": [
            {"question_id": answer.question_id, "answer_text": answer.answer_text, "selected_option": answer.selected_option, "marked_for_review": answer.marked_for_review}
            for answer in saved_answers
        ],
    }
