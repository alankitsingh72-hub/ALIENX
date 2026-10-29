from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import AuditLog, PYQPaper, PYQQuestion, Subject, User, UserRole
from app.schemas import PYQPaperCreate, PYQPaperRead, PYQQuestionCreate, PYQQuestionRead

router = APIRouter(prefix="/pyq", tags=["previous year questions"])


def _serialize_paper(p: PYQPaper, question_count: int = 0) -> PYQPaperRead:
    return PYQPaperRead(
        id=p.id,
        subject_id=p.subject_id,
        subject_name=p.subject.name if p.subject else None,
        title=p.title,
        year=p.year,
        exam_type=p.exam_type,
        university=p.university,
        description=p.description or "",
        file_url=p.file_url,
        created_by=p.created_by,
        created_at=p.created_at,
        question_count=question_count,
    )


def _serialize_question(q: PYQQuestion) -> PYQQuestionRead:
    return PYQQuestionRead(
        id=q.id,
        subject_id=q.subject_id,
        subject_name=q.subject.name if q.subject else None,
        paper_id=q.paper_id,
        year=q.year,
        question_text=q.question_text,
        marks=q.marks,
        question_type=q.question_type,
        options=q.options,
        correct_answer=q.correct_answer,
        solution=q.solution,
        difficulty=q.difficulty,
        tags=q.tags or [],
        created_by=q.created_by,
        created_at=q.created_at,
    )


# PAPERS
@router.get("/papers", response_model=list[PYQPaperRead])
def list_pyq_papers(
    subject_id: int | None = Query(default=None),
    year: int | None = Query(default=None),
    exam_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(PYQPaper).options(joinedload(PYQPaper.subject))
    if isinstance(subject_id, int):
        query = query.where(PYQPaper.subject_id == subject_id)
    if isinstance(year, int):
        query = query.where(PYQPaper.year == year)
    if isinstance(exam_type, str) and exam_type.strip():
        query = query.where(PYQPaper.exam_type.ilike(f"%{exam_type.strip()}%"))
    if isinstance(search, str) and search.strip():
        query = query.where(PYQPaper.title.ilike(f"%{search.strip()}%"))

    papers = list(db.scalars(query.order_by(PYQPaper.year.desc(), PYQPaper.created_at.desc())).all())
    results = []
    for p in papers:
        q_count = db.scalar(select(func.count(PYQQuestion.id)).where(PYQQuestion.paper_id == p.id)) or 0
        results.append(_serialize_paper(p, q_count))
    return results


@router.post("/papers", response_model=PYQPaperRead, status_code=status.HTTP_201_CREATED)
def create_pyq_paper(
    payload: PYQPaperCreate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    subject = db.get(Subject, payload.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    paper = PYQPaper(**payload.model_dump(), created_by=user.id)
    db.add(paper)
    db.flush()
    db.add(AuditLog(actor_id=user.id, action="pyq_paper_created", entity_type="pyq_paper", entity_id=paper.id))
    db.commit()
    db.refresh(paper)
    return _serialize_paper(paper, 0)


@router.get("/papers/{paper_id}", response_model=dict)
def get_pyq_paper(paper_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    paper = db.scalar(
        select(PYQPaper)
        .options(joinedload(PYQPaper.subject), selectinload(PYQPaper.questions).joinedload(PYQQuestion.subject))
        .where(PYQPaper.id == paper_id)
    )
    if not paper:
        raise HTTPException(status_code=404, detail="PYQ Paper not found")

    serialized_paper = _serialize_paper(paper, len(paper.questions))
    serialized_questions = [_serialize_question(q) for q in paper.questions]
    return {
        "paper": serialized_paper,
        "questions": serialized_questions,
    }


@router.delete("/papers/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pyq_paper(
    paper_id: int,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    paper = db.get(PYQPaper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="PYQ Paper not found")
    if user.role != UserRole.admin and paper.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only delete your own papers")

    db.delete(paper)
    db.add(AuditLog(actor_id=user.id, action="pyq_paper_deleted", entity_type="pyq_paper", entity_id=paper_id))
    db.commit()


# QUESTIONS
@router.get("/questions", response_model=list[PYQQuestionRead])
def list_pyq_questions(
    subject_id: int | None = Query(default=None),
    year: int | None = Query(default=None),
    paper_id: int | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    search: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(PYQQuestion).options(joinedload(PYQQuestion.subject))
    if isinstance(subject_id, int):
        query = query.where(PYQQuestion.subject_id == subject_id)
    if isinstance(year, int):
        query = query.where(PYQQuestion.year == year)
    if isinstance(paper_id, int):
        query = query.where(PYQQuestion.paper_id == paper_id)
    if isinstance(difficulty, str) and difficulty.strip():
        query = query.where(PYQQuestion.difficulty == difficulty.strip())
    if isinstance(search, str) and search.strip():
        query = query.where(PYQQuestion.question_text.ilike(f"%{search.strip()}%"))

    questions = list(db.scalars(query.order_by(PYQQuestion.year.desc(), PYQQuestion.created_at.desc()).limit(300)).all())
    return [_serialize_question(q) for q in questions]


@router.post("/questions", response_model=PYQQuestionRead, status_code=status.HTTP_201_CREATED)
def create_pyq_question(
    payload: PYQQuestionCreate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    subject = db.get(Subject, payload.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if payload.paper_id:
        paper = db.get(PYQPaper, payload.paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="PYQ Paper not found")

    question = PYQQuestion(**payload.model_dump(), created_by=user.id)
    db.add(question)
    db.flush()
    db.add(AuditLog(actor_id=user.id, action="pyq_question_created", entity_type="pyq_question", entity_id=question.id))
    db.commit()
    db.refresh(question)
    return _serialize_question(question)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pyq_question(
    question_id: int,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    question = db.get(PYQQuestion, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="PYQ Question not found")
    if user.role != UserRole.admin and question.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only delete your own questions")

    db.delete(question)
    db.add(AuditLog(actor_id=user.id, action="pyq_question_deleted", entity_type="pyq_question", entity_id=question_id))
    db.commit()
