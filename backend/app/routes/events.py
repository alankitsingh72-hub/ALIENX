from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import AuditLog, Event, EventRegistration, User, UserRole
from app.schemas import EventCreate, EventRead, EventRegistrationRead, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])


def _compute_event_status(start: datetime, end: datetime) -> str:
    now = datetime.now(timezone.utc)
    # Ensure tz-aware comparisons
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    if now < start:
        return "upcoming"
    elif now > end:
        return "past"
    return "ongoing"


def _serialize_event(event: Event, user_id: int | None = None) -> EventRead:
    regs = event.registrations or []
    is_reg = any(r.user_id == user_id for r in regs) if user_id else False
    st = _compute_event_status(event.start_time, event.end_time)
    return EventRead(
        id=event.id,
        title=event.title,
        event_type=event.event_type,
        description=event.description,
        rules=event.rules or "",
        prizes=event.prizes or "",
        start_time=event.start_time,
        end_time=event.end_time,
        duration=event.duration,
        registration_deadline=event.registration_deadline,
        max_participants=event.max_participants,
        is_published=event.is_published,
        created_by=event.created_by,
        created_at=event.created_at,
        registration_count=len(regs),
        is_registered=is_reg,
        status=st,
    )


@router.get("", response_model=list[EventRead])
def list_events(
    timeframe: str = Query(default="all"),  # all, upcoming, ongoing, past
    event_type: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Event).options(selectinload(Event.registrations))
    if user.role == UserRole.student:
        query = query.where(Event.is_published.is_(True))
    if event_type:
        query = query.where(Event.event_type.ilike(event_type))

    events = list(db.scalars(query.order_by(Event.start_time.asc())).all())
    serialized = [_serialize_event(e, user_id=user.id) for e in events]

    if timeframe in ("upcoming", "ongoing", "past"):
        serialized = [e for e in serialized if e.status == timeframe]

    return serialized


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    event = Event(**payload.model_dump(), created_by=user.id)
    db.add(event)
    db.flush()
    db.add(AuditLog(actor_id=user.id, action="event_created", entity_type="event", entity_id=event.id))
    db.commit()
    db.refresh(event)
    return _serialize_event(event, user_id=user.id)


@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.scalar(
        select(Event)
        .options(selectinload(Event.registrations))
        .where(Event.id == event_id)
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event.is_published and user.role == UserRole.student:
        raise HTTPException(status_code=403, detail="Event is not published")
    return _serialize_event(event, user_id=user.id)


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    payload: EventUpdate,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    event = db.scalar(
        select(Event)
        .options(selectinload(Event.registrations))
        .where(Event.id == event_id)
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if user.role != UserRole.admin and event.created_by != user.id:
        raise HTTPException(status_code=403, detail="You can only edit events you created")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(event, field, val)

    db.add(AuditLog(actor_id=user.id, action="event_updated", entity_type="event", entity_id=event.id))
    db.commit()
    db.refresh(event)
    return _serialize_event(event, user_id=user.id)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if user.role != UserRole.admin and event.created_by != user.id:
        raise HTTPException(status_code=403, detail="You can only delete events you created")

    db.delete(event)
    db.add(AuditLog(actor_id=user.id, action="event_deleted", entity_type="event", entity_id=event_id))
    db.commit()


@router.post("/{event_id}/register")
def toggle_event_registration(
    event_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.scalar(
        select(Event)
        .options(selectinload(Event.registrations))
        .where(Event.id == event_id)
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event.is_published:
        raise HTTPException(status_code=400, detail="Event is not active")

    existing = db.scalar(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == user.id,
        )
    )

    if existing:
        db.delete(existing)
        db.commit()
        return {"registered": False, "message": "Successfully unregistered from event"}

    # Check capacity
    count = db.scalar(
        select(func.count(EventRegistration.id)).where(EventRegistration.event_id == event_id)
    ) or 0
    if count >= event.max_participants:
        raise HTTPException(status_code=400, detail="Event has reached maximum capacity")

    reg = EventRegistration(event_id=event_id, user_id=user.id, status="registered")
    db.add(reg)
    db.add(AuditLog(actor_id=user.id, action="event_registered", entity_type="event", entity_id=event_id))
    db.commit()
    return {"registered": True, "message": "Successfully registered for event"}


@router.get("/my/registrations", response_model=list[EventRegistrationRead])
def my_event_registrations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    regs = list(
        db.scalars(
            select(EventRegistration)
            .options(selectinload(EventRegistration.event))
            .where(EventRegistration.user_id == user.id)
            .order_by(EventRegistration.registered_at.desc())
        ).all()
    )
    return [
        EventRegistrationRead(
            id=r.id,
            event_id=r.event_id,
            user_id=r.user_id,
            status=r.status,
            registered_at=r.registered_at,
            user_name=user.full_name,
            user_email=user.email,
            event_title=r.event.title if r.event else None,
        )
        for r in regs
    ]

