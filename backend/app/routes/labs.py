from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import AuditLog, LabCompletion, LabManual, Subject, User, UserRole
from app.schemas import LabManualCreate, LabManualRead

router = APIRouter(prefix="/labs", tags=["lab manuals"])


def _serialize_manual(m: LabManual, is_completed: bool = False) -> LabManualRead:
    return LabManualRead(
        id=m.id,
        subject_id=m.subject_id,
        subject_name=m.subject.name if m.subject else None,
        title=m.title,
        lab_number=m.lab_number,
        objectives=m.objectives or "",
        theory=m.theory or "",
        procedure=m.procedure or "",
        sample_code=m.sample_code,
        programming_language=m.programming_language or "python",
        expected_output=m.expected_output,
        viva_questions=m.viva_questions or [],
        file_url=m.file_url,
        created_by=m.created_by,
        created_at=m.created_at,
        is_completed=is_completed,
    )


@router.get("", response_model=list[LabManualRead])
def list_lab_manuals(
    subject_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(LabManual).options(joinedload(LabManual.subject))
    if isinstance(subject_id, int):
        query = query.where(LabManual.subject_id == subject_id)
    if isinstance(search, str) and search.strip():
        query = query.where(LabManual.title.ilike(f"%{search.strip()}%"))

    manuals = list(db.scalars(query.order_by(LabManual.lab_number.asc(), LabManual.created_at.asc())).all())

    # Get completion set for student
    completed_ids = set()
    if user.role == UserRole.student:
        completed_ids = set(
            db.scalars(
                select(LabCompletion.manual_id).where(LabCompletion.student_id == user.id)
            ).all()
        )

    return [_serialize_manual(m, m.id in completed_ids) for m in manuals]


@router.get("/{manual_id}", response_model=LabManualRead)
def get_lab_manual(manual_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    manual = db.scalar(select(LabManual).options(joinedload(LabManual.subject)).where(LabManual.id == manual_id))
    if not manual:
        raise HTTPException(status_code=404, detail="Lab Manual not found")

    is_completed = False
    if user.role == UserRole.student:
        is_completed = db.scalar(
            select(LabCompletion.id).where(LabCompletion.student_id == user.id, LabCompletion.manual_id == manual_id)
        ) is not None

    return _serialize_manual(manual, is_completed)


@router.post("", response_model=LabManualRead, status_code=status.HTTP_201_CREATED)
def create_lab_manual(
    payload: LabManualCreate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    subject = db.get(Subject, payload.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    manual = LabManual(**payload.model_dump(), created_by=user.id)
    db.add(manual)
    db.flush()
    db.add(AuditLog(actor_id=user.id, action="lab_manual_created", entity_type="lab_manual", entity_id=manual.id))
    db.commit()
    db.refresh(manual)
    return _serialize_manual(manual, False)


@router.patch("/{manual_id}", response_model=LabManualRead)
def update_lab_manual(
    manual_id: int,
    payload: LabManualCreate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    manual = db.get(LabManual, manual_id)
    if not manual:
        raise HTTPException(status_code=404, detail="Lab Manual not found")
    if user.role != UserRole.admin and manual.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only edit your own lab manuals")

    for key, value in payload.model_dump().items():
        setattr(manual, key, value)

    db.add(AuditLog(actor_id=user.id, action="lab_manual_updated", entity_type="lab_manual", entity_id=manual.id))
    db.commit()
    db.refresh(manual)
    return _serialize_manual(manual, False)


@router.delete("/{manual_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lab_manual(
    manual_id: int,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    manual = db.get(LabManual, manual_id)
    if not manual:
        raise HTTPException(status_code=404, detail="Lab Manual not found")
    if user.role != UserRole.admin and manual.created_by != user.id:
        raise HTTPException(status_code=403, detail="You may only delete your own lab manuals")

    db.delete(manual)
    db.add(AuditLog(actor_id=user.id, action="lab_manual_deleted", entity_type="lab_manual", entity_id=manual_id))
    db.commit()


@router.post("/{manual_id}/toggle-complete")
def toggle_lab_completion(
    manual_id: int,
    user: User = Depends(require_roles(UserRole.student)),
    db: Session = Depends(get_db),
):
    manual = db.get(LabManual, manual_id)
    if not manual:
        raise HTTPException(status_code=404, detail="Lab Manual not found")

    completion = db.scalar(
        select(LabCompletion).where(
            LabCompletion.student_id == user.id,
            LabCompletion.manual_id == manual_id,
        )
    )

    if completion:
        db.delete(completion)
        db.commit()
        return {"manual_id": manual_id, "is_completed": False}
    else:
        new_comp = LabCompletion(student_id=user.id, manual_id=manual_id)
        db.add(new_comp)
        db.commit()
        return {"manual_id": manual_id, "is_completed": True}
