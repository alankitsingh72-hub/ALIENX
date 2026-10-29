from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import AuditLog, Examination, LabManual, PYQPaper, Question, Subject, User, UserRole
from app.schemas import SubjectCreate, SubjectRead

router = APIRouter(prefix="/subjects", tags=["subjects"])


class SubjectDetailRead(SubjectRead):
    question_count: int = 0
    exam_count: int = 0
    pyq_count: int = 0
    lab_count: int = 0


@router.get("", response_model=list[SubjectDetailRead])
def list_subjects(
    search: str | None = Query(default=None, max_length=160),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Subject)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where((Subject.name.ilike(search_pattern)) | (Subject.code.ilike(search_pattern)))
    subjects = list(db.scalars(query.order_by(Subject.name)).all())

    results = []
    for s in subjects:
        q_count = db.scalar(select(func.count(Question.id)).where(Question.subject_id == s.id, Question.deleted_at.is_(None))) or 0
        e_count = db.scalar(select(func.count(Examination.id)).where(Examination.subject_id == s.id)) or 0
        p_count = db.scalar(select(func.count(PYQPaper.id)).where(PYQPaper.subject_id == s.id)) or 0
        l_count = db.scalar(select(func.count(LabManual.id)).where(LabManual.subject_id == s.id)) or 0

        results.append(
            SubjectDetailRead(
                id=s.id,
                name=s.name,
                code=s.code,
                description=s.description or "",
                created_by=s.created_by,
                created_at=s.created_at,
                question_count=q_count,
                exam_count=e_count,
                pyq_count=p_count,
                lab_count=l_count,
            )
        )
    return results


@router.get("/{subject_id}", response_model=SubjectDetailRead)
def get_subject(subject_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.get(Subject, subject_id)
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")

    q_count = db.scalar(select(func.count(Question.id)).where(Question.subject_id == s.id, Question.deleted_at.is_(None))) or 0
    e_count = db.scalar(select(func.count(Examination.id)).where(Examination.subject_id == s.id)) or 0
    p_count = db.scalar(select(func.count(PYQPaper.id)).where(PYQPaper.subject_id == s.id)) or 0
    l_count = db.scalar(select(func.count(LabManual.id)).where(LabManual.subject_id == s.id)) or 0

    return SubjectDetailRead(
        id=s.id,
        name=s.name,
        code=s.code,
        description=s.description or "",
        created_by=s.created_by,
        created_at=s.created_at,
        question_count=q_count,
        exam_count=e_count,
        pyq_count=p_count,
        lab_count=l_count,
    )


@router.post("", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    existing = db.scalar(select(Subject).where((Subject.name.ilike(payload.name)) | (Subject.code.ilike(payload.code))))
    if existing:
        raise HTTPException(status_code=409, detail="A subject with this name or code already exists")

    subject = Subject(
        name=payload.name,
        code=payload.code.upper(),
        description=payload.description,
        created_by=user.id,
    )
    db.add(subject)
    db.flush()
    db.add(AuditLog(actor_id=user.id, action="subject_created", entity_type="subject", entity_id=subject.id))
    db.commit()
    db.refresh(subject)
    return subject


@router.patch("/{subject_id}", response_model=SubjectRead)
def update_subject(
    subject_id: int,
    payload: SubjectCreate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    duplicate = db.scalar(
        select(Subject).where(
            ((Subject.name.ilike(payload.name)) | (Subject.code.ilike(payload.code))),
            Subject.id != subject_id,
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Another subject already has this name or code")

    subject.name = payload.name
    subject.code = payload.code.upper()
    subject.description = payload.description
    db.add(AuditLog(actor_id=user.id, action="subject_updated", entity_type="subject", entity_id=subject.id))
    db.commit()
    db.refresh(subject)
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    user: User = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
):
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    has_q = db.scalar(select(Question.id).where(Question.subject_id == subject_id).limit(1))
    has_e = db.scalar(select(Examination.id).where(Examination.subject_id == subject_id).limit(1))
    if has_q or has_e:
        raise HTTPException(status_code=409, detail="Cannot delete subject that is linked to existing questions or exams")

    db.delete(subject)
    db.add(AuditLog(actor_id=user.id, action="subject_deleted", entity_type="subject", entity_id=subject_id))
    db.commit()

