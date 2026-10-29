from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.models import Attempt, AuditLog, Examination, User, UserRole
from app.schemas import AdminUserCreate, AdminUserUpdate, UserRead
from app.security import hash_password

router = APIRouter(prefix="/admin", tags=["administration"])


@router.post("/users", response_model=UserRead, status_code=201)
def create_user(payload: AdminUserCreate, admin: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    new_user = User(
        email=email, hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(), role=payload.role,
    )
    try:
        db.add(new_user)
        db.flush()
        db.add(AuditLog(actor_id=admin.id, action="user_created", entity_type="user", entity_id=new_user.id, details={"role": payload.role.value}))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists") from exc
    db.refresh(new_user)
    return new_user


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: AdminUserUpdate, admin: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and (not payload.is_active or payload.role != UserRole.admin):
        raise HTTPException(status_code=422, detail="You cannot deactivate or demote your own account")
    user.full_name = payload.full_name
    user.role = payload.role
    user.is_active = payload.is_active
    db.add(AuditLog(actor_id=admin.id, action="user_updated", entity_type="user", entity_id=user.id, details={"role": payload.role.value, "is_active": payload.is_active}))
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserRead])
def list_users(user: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)):
    return list(db.scalars(select(User).order_by(User.created_at.desc()).limit(500)))


@router.patch("/users/{user_id}/active")
def set_user_active(user_id: int, active: bool, admin: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and not active:
        raise HTTPException(status_code=422, detail="You cannot deactivate your own account")
    user.is_active = active
    db.add(AuditLog(actor_id=admin.id, action="user_active_changed", entity_type="user", entity_id=user.id, details={"active": active}))
    db.commit()
    return {"updated": True}


@router.get("/analytics")
def analytics(admin: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)):
    return {
        "users": db.scalar(select(func.count(User.id))) or 0,
        "examinations": db.scalar(select(func.count(Examination.id))) or 0,
        "attempts": db.scalar(select(func.count(Attempt.id))) or 0,
        "submitted_attempts": db.scalar(select(func.count(Attempt.id)).where(Attempt.status == "submitted")) or 0,
    }


@router.get("/audit-logs")
def audit_logs(admin: User = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)):
    return list(db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(200)))
