import pytest
from fastapi import HTTPException

from app.models import User, UserRole
from app.routes.admin import analytics, audit_logs, create_user, list_users, set_user_active, update_user
from app.schemas import AdminUserCreate, AdminUserUpdate


def test_admin_create_user(db_session, admin_user):
    payload = AdminUserCreate(
        email="faculty_new@alienx.demo",
        password="SecurePassword123!",
        full_name="New Faculty Member",
        role=UserRole.faculty,
    )
    user = create_user(payload, admin_user, db_session)
    assert user.id is not None
    assert user.email == "faculty_new@alienx.demo"
    assert user.role == UserRole.faculty


def test_admin_create_duplicate_fails(db_session, admin_user, student_user):
    payload = AdminUserCreate(
        email=student_user.email,
        password="SecurePassword123!",
        full_name="Duplicate",
        role=UserRole.student,
    )
    with pytest.raises(HTTPException) as exc_info:
        create_user(payload, admin_user, db_session)
    assert exc_info.value.status_code == 409


def test_admin_update_user_role_and_status(db_session, admin_user, student_user):
    payload = AdminUserUpdate(
        full_name="Promoted Student",
        role=UserRole.faculty,
        is_active=True,
    )
    updated = update_user(student_user.id, payload, admin_user, db_session)
    assert updated.full_name == "Promoted Student"
    assert updated.role == UserRole.faculty


def test_admin_cannot_demote_or_deactivate_self(db_session, admin_user):
    payload = AdminUserUpdate(
        full_name=admin_user.full_name,
        role=UserRole.student,
        is_active=True,
    )
    with pytest.raises(HTTPException) as exc_info:
        update_user(admin_user.id, payload, admin_user, db_session)
    assert exc_info.value.status_code == 422

    with pytest.raises(HTTPException) as exc_info2:
        set_user_active(admin_user.id, False, admin_user, db_session)
    assert exc_info2.value.status_code == 422


def test_admin_list_users(db_session, admin_user, student_user, faculty_user):
    users = list_users(admin_user, db_session)
    assert len(users) >= 3
    emails = [u.email for u in users]
    assert admin_user.email in emails
    assert student_user.email in emails
    assert faculty_user.email in emails


def test_admin_analytics_and_audit_logs(db_session, admin_user):
    data = analytics(admin_user, db_session)
    assert "users" in data
    assert "examinations" in data
    assert "attempts" in data
    assert "submitted_attempts" in data

    logs = audit_logs(admin_user, db_session)
    assert isinstance(logs, list)

