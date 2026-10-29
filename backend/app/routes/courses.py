from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import AuditLog, Course, CourseEnrollment, User, UserRole
from app.schemas import (
    CourseCreate,
    CourseEnrollmentRead,
    CourseProgressUpdate,
    CourseRead,
    CourseUpdate,
)

router = APIRouter(prefix="/courses", tags=["certification courses"])


def _serialize_course(course: Course, user_id: int | None = None) -> CourseRead:
    enrollments = course.enrollments or []
    user_enr = next((e for e in enrollments if e.user_id == user_id), None) if user_id else None

    return CourseRead(
        id=course.id,
        title=course.title,
        code=course.code,
        description=course.description,
        duration_hours=course.duration_hours,
        level=course.level,
        skills_covered=course.skills_covered or [],
        syllabus=course.syllabus or [],
        certificate_preview=course.certificate_preview or "",
        is_published=course.is_published,
        created_by=course.created_by,
        created_at=course.created_at,
        enrollment_count=len(enrollments),
        is_enrolled=user_enr is not None,
        student_progress=user_enr.progress_percentage if user_enr else 0,
        student_status=user_enr.status if user_enr else None,
        certificate_id=user_enr.certificate_id if user_enr else None,
    )


@router.get("", response_model=list[CourseRead])
def list_courses(
    level: str | None = Query(default=None),
    search: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Course).options(selectinload(Course.enrollments))
    if user.role == UserRole.student:
        query = query.where(Course.is_published.is_(True))
    if level and level != "All":
        query = query.where(Course.level.ilike(level))
    if search:
        query = query.where(Course.title.ilike(f"%{search}%") | Course.code.ilike(f"%{search}%"))

    courses = list(db.scalars(query.order_by(Course.created_at.desc())).all())
    return [_serialize_course(c, user_id=user.id) for c in courses]


@router.post("", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    existing = db.scalar(select(Course).where(Course.code == payload.code.upper().strip()))
    if existing:
        raise HTTPException(status_code=400, detail="A course with this code already exists")

    course_data = payload.model_dump()
    course_data["code"] = course_data["code"].upper().strip()
    course = Course(**course_data, created_by=user.id)
    db.add(course)
    db.flush()
    db.add(AuditLog(actor_id=user.id, action="course_created", entity_type="course", entity_id=course.id))
    db.commit()
    db.refresh(course)
    return _serialize_course(course, user_id=user.id)


@router.get("/{course_id}", response_model=CourseRead)
def get_course(
    course_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.scalar(
        select(Course)
        .options(selectinload(Course.enrollments))
        .where(Course.id == course_id)
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not course.is_published and user.role == UserRole.student:
        raise HTTPException(status_code=403, detail="Course is not published")
    return _serialize_course(course, user_id=user.id)


@router.patch("/{course_id}", response_model=CourseRead)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    course = db.scalar(
        select(Course)
        .options(selectinload(Course.enrollments))
        .where(Course.id == course_id)
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if user.role != UserRole.admin and course.created_by != user.id:
        raise HTTPException(status_code=403, detail="You can only edit courses you created")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "code" and val:
            val = val.upper().strip()
        setattr(course, field, val)

    db.add(AuditLog(actor_id=user.id, action="course_updated", entity_type="course", entity_id=course.id))
    db.commit()
    db.refresh(course)
    return _serialize_course(course, user_id=user.id)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if user.role != UserRole.admin and course.created_by != user.id:
        raise HTTPException(status_code=403, detail="You can only delete courses you created")

    db.delete(course)
    db.add(AuditLog(actor_id=user.id, action="course_deleted", entity_type="course", entity_id=course_id))
    db.commit()


@router.post("/{course_id}/enroll", response_model=CourseEnrollmentRead)
def enroll_course(
    course_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not course.is_published:
        raise HTTPException(status_code=400, detail="Course is not currently available")

    existing = db.scalar(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.user_id == user.id,
        )
    )
    if existing:
        return CourseEnrollmentRead(
            id=existing.id,
            course_id=existing.course_id,
            user_id=existing.user_id,
            progress_percentage=existing.progress_percentage,
            completed_modules=existing.completed_modules or [],
            status=existing.status,
            certificate_id=existing.certificate_id,
            enrolled_at=existing.enrolled_at,
            completed_at=existing.completed_at,
            course_title=course.title,
            course_code=course.code,
            student_name=user.full_name,
        )

    enr = CourseEnrollment(
        course_id=course_id,
        user_id=user.id,
        progress_percentage=0,
        completed_modules=[],
        status="enrolled",
    )
    db.add(enr)
    db.add(AuditLog(actor_id=user.id, action="course_enrolled", entity_type="course", entity_id=course_id))
    db.commit()
    db.refresh(enr)

    return CourseEnrollmentRead(
        id=enr.id,
        course_id=enr.course_id,
        user_id=enr.user_id,
        progress_percentage=enr.progress_percentage,
        completed_modules=enr.completed_modules or [],
        status=enr.status,
        certificate_id=enr.certificate_id,
        enrolled_at=enr.enrolled_at,
        completed_at=enr.completed_at,
        course_title=course.title,
        course_code=course.code,
        student_name=user.full_name,
    )


@router.post("/{course_id}/progress", response_model=CourseEnrollmentRead)
def update_course_progress(
    course_id: int,
    payload: CourseProgressUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enr = db.scalar(
        select(CourseEnrollment)
        .options(selectinload(CourseEnrollment.course))
        .where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.user_id == user.id,
        )
    )
    if not enr:
        raise HTTPException(status_code=404, detail="Enrollment record not found. Please enroll first.")

    modules = set(enr.completed_modules or [])
    if payload.completed_module_id:
        modules.add(payload.completed_module_id)
    enr.completed_modules = list(modules)

    pct = max(enr.progress_percentage, payload.progress_percentage)
    enr.progress_percentage = min(100, pct)

    if enr.progress_percentage >= 100:
        enr.status = "completed"
        if not enr.completed_at:
            enr.completed_at = datetime.now(timezone.utc)
        if not enr.certificate_id:
            short_id = uuid.uuid4().hex[:8].upper()
            enr.certificate_id = f"ALX-CERT-{enr.course.code}-{short_id}"
    else:
        enr.status = "in_progress"

    db.add(AuditLog(actor_id=user.id, action="course_progress_updated", entity_type="course", entity_id=course_id))
    db.commit()
    db.refresh(enr)

    return CourseEnrollmentRead(
        id=enr.id,
        course_id=enr.course_id,
        user_id=enr.user_id,
        progress_percentage=enr.progress_percentage,
        completed_modules=enr.completed_modules or [],
        status=enr.status,
        certificate_id=enr.certificate_id,
        enrolled_at=enr.enrolled_at,
        completed_at=enr.completed_at,
        course_title=enr.course.title if enr.course else None,
        course_code=enr.course.code if enr.course else None,
        student_name=user.full_name,
    )


@router.get("/certificates/{certificate_id}")
def verify_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
):
    enr = db.scalar(
        select(CourseEnrollment)
        .options(selectinload(CourseEnrollment.course), selectinload(CourseEnrollment.user))
        .where(CourseEnrollment.certificate_id == certificate_id)
    )
    if not enr:
        raise HTTPException(status_code=404, detail="Invalid certificate credential identifier")

    return {
        "valid": True,
        "certificate_id": enr.certificate_id,
        "recipient_name": enr.user.full_name,
        "course_title": enr.course.title,
        "course_code": enr.course.code,
        "duration_hours": enr.course.duration_hours,
        "level": enr.course.level,
        "skills_covered": enr.course.skills_covered or [],
        "completed_at": enr.completed_at.isoformat() if enr.completed_at else None,
        "issuer": "ALIENX Autonomous Examination & Certification Platform",
        "verification_url": f"/courses/verify?cert_id={enr.certificate_id}",
    }


@router.get("/my/enrollments", response_model=list[CourseEnrollmentRead])
def my_course_enrollments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enrollments = list(
        db.scalars(
            select(CourseEnrollment)
            .options(selectinload(CourseEnrollment.course))
            .where(CourseEnrollment.user_id == user.id)
            .order_by(CourseEnrollment.enrolled_at.desc())
        ).all()
    )
    return [
        CourseEnrollmentRead(
            id=e.id,
            course_id=e.course_id,
            user_id=e.user_id,
            progress_percentage=e.progress_percentage,
            completed_modules=e.completed_modules or [],
            status=e.status,
            certificate_id=e.certificate_id,
            enrolled_at=e.enrolled_at,
            completed_at=e.completed_at,
            course_title=e.course.title if e.course else None,
            course_code=e.course.code if e.course else None,
            student_name=user.full_name,
        )
        for e in enrollments
    ]

