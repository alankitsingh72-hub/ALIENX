from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Attempt, AuditLog, ExaminationQuestion, Question, User, UserRole
from app.schemas import QuestionCreate, QuestionRead

router = APIRouter(prefix="/questions", tags=["question bank"])


def _serialize_question(q: Question) -> QuestionRead:
    return QuestionRead(
        id=q.id,
        subject_id=q.subject_id,
        subject_name=q.subject.name if q.subject else None,
        title=q.title,
        content=q.content,
        type=q.type,
        options=q.options,
        correct_answer=q.correct_answer,
        model_answer=q.model_answer,
        keywords=q.keywords or [],
        explanation=q.explanation,
        marks=q.marks,
        difficulty=q.difficulty,
        tags=q.tags or [],
        created_by=q.created_by,
        is_hots=bool(q.is_hots),
    )


@router.get("", response_model=list[QuestionRead])
def list_questions(
    search: str | None = Query(default=None, max_length=160),
    question_type: str | None = Query(default=None, alias="type"),
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
    subject_id: int | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    is_hots: bool | None = Query(default=None),
):
    query = select(Question).options(joinedload(Question.subject)).where(Question.deleted_at.is_(None))
    if user.role != UserRole.admin:
        query = query.where(Question.created_by == user.id)
    if isinstance(subject_id, int):
        query = query.where(Question.subject_id == subject_id)
    if search:
        query = query.where(Question.title.ilike(f"%{search}%") | Question.content.ilike(f"%{search}%"))
    if question_type:
        query = query.where(Question.type == question_type)
    if isinstance(difficulty, str) and difficulty.lower() != "all":
        diff = difficulty.lower()
        if diff == "hard":
            diff = "tough"
        query = query.where(Question.difficulty == diff)
    if isinstance(is_hots, bool):
        query = query.where(Question.is_hots == is_hots)

    questions = list(db.scalars(query.order_by(Question.created_at.desc()).limit(400)).all())
    return [_serialize_question(q) for q in questions]


@router.get("/hots", response_model=list[QuestionRead])
def list_hots_questions(
    subject_id: int | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    search: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Students and faculty can browse Higher Order Thinking Skills (HOTS) questions for practice."""
    query = (
        select(Question)
        .options(joinedload(Question.subject))
        .where(Question.deleted_at.is_(None), Question.is_hots.is_(True))
    )
    if isinstance(subject_id, int):
        query = query.where(Question.subject_id == subject_id)
    if difficulty and difficulty.lower() != "all":
        diff = difficulty.lower()
        if diff == "hard":
            diff = "tough"
        query = query.where(Question.difficulty == diff)
    if search:
        query = query.where(Question.title.ilike(f"%{search}%") | Question.content.ilike(f"%{search}%"))

    questions = list(db.scalars(query.order_by(Question.id.asc()).limit(200)).all())
    return [_serialize_question(q) for q in questions]


@router.post("", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
def create_question(payload: QuestionCreate, user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)), db: Session = Depends(get_db)):
    question = Question(**payload.model_dump(), created_by=user.id)
    db.add(question)
    db.flush()
    db.add(AuditLog(actor_id=user.id, action="question_created", entity_type="question", entity_id=question.id))
    db.commit()
    db.refresh(question)
    return _serialize_question(question)


@router.post("/bulk", response_model=list[QuestionRead], status_code=status.HTTP_201_CREATED)
def bulk_create_questions(
    payloads: list[QuestionCreate],
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    created = []
    for item in payloads:
        q = Question(**item.model_dump(), created_by=user.id)
        db.add(q)
        created.append(q)
    db.flush()
    for q in created:
        db.add(AuditLog(actor_id=user.id, action="question_created_bulk", entity_type="question", entity_id=q.id))
    db.commit()
    for q in created:
        db.refresh(q)
    return [_serialize_question(q) for q in created]


@router.patch("/{question_id}", response_model=QuestionRead)
def update_question(question_id: int, payload: QuestionCreate, user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)), db: Session = Depends(get_db)):
    question = db.get(Question, question_id)
    if question is None or question.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Question not found")
    if user.role != UserRole.admin and question.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only edit your own questions")
    has_attempts = db.scalar(
        select(Attempt.id)
        .join(ExaminationQuestion, ExaminationQuestion.examination_id == Attempt.examination_id)
        .where(ExaminationQuestion.question_id == question.id)
        .limit(1)
    )
    if has_attempts is not None:
        raise HTTPException(status_code=409, detail="Questions used in an examination attempt cannot be edited")
    for key, value in payload.model_dump().items():
        setattr(question, key, value)
    db.add(AuditLog(actor_id=user.id, action="question_updated", entity_type="question", entity_id=question.id))
    db.commit()
    db.refresh(question)
    return _serialize_question(question)


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)), db: Session = Depends(get_db)):
    question = db.get(Question, question_id)
    if question is None or question.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Question not found")
    if user.role != UserRole.admin and question.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only delete your own questions")
    question.deleted_at = datetime.now(timezone.utc)
    db.add(AuditLog(actor_id=user.id, action="question_deleted", entity_type="question", entity_id=question.id))
    db.commit()
