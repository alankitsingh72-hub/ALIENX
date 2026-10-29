import pytest
from fastapi import HTTPException

from app.routes.auth import login, logout, me, refresh, register, update_profile
from app.schemas import LoginRequest, ProfileUpdate, RefreshRequest, UserCreate


def test_register_student_success(mock_request, db_session):
    req = mock_request(path="/api/v1/auth/register", method="POST")
    payload = UserCreate(email="newstudent@alienx.demo", password="StrongPassword123!", full_name="New Student")
    user = register(req, payload, db_session)

    assert user.id is not None
    assert user.email == "newstudent@alienx.demo"
    assert user.role.value == "student"
    assert user.full_name == "New Student"


def test_register_duplicate_email_fails(mock_request, db_session, student_user):
    req = mock_request(path="/api/v1/auth/register", method="POST")
    payload = UserCreate(email=student_user.email, password="StrongPassword123!", full_name="Duplicate Student")

    with pytest.raises(HTTPException) as exc_info:
        register(req, payload, db_session)
    assert exc_info.value.status_code == 409


def test_login_success(mock_request, db_session, student_user):
    req = mock_request(path="/api/v1/auth/login", method="POST")
    payload = LoginRequest(email=student_user.email, password="Password123!")
    tokens = login(req, payload, db_session)

    assert tokens.access_token
    assert tokens.refresh_token
    assert tokens.user.email == student_user.email


def test_login_incorrect_password_fails(mock_request, db_session, student_user):
    req = mock_request(path="/api/v1/auth/login", method="POST")
    payload = LoginRequest(email=student_user.email, password="WrongPassword!")

    with pytest.raises(HTTPException) as exc_info:
        login(req, payload, db_session)
    assert exc_info.value.status_code == 401


def test_refresh_token_success(mock_request, db_session, student_user):
    req = mock_request(path="/api/v1/auth/login", method="POST")
    login_tokens = login(req, LoginRequest(email=student_user.email, password="Password123!"), db_session)

    refreshed = refresh(RefreshRequest(refresh_token=login_tokens.refresh_token), db_session)
    assert refreshed.access_token
    assert refreshed.refresh_token
    assert refreshed.user.email == student_user.email


def test_get_current_user_profile(student_user):
    result = me(student_user)
    assert result.email == student_user.email
    assert result.role.value == "student"


def test_update_profile(db_session, student_user):
    updated = update_profile(ProfileUpdate(full_name="Updated Alex"), student_user, db_session)
    assert updated.full_name == "Updated Alex"


def test_logout(db_session, student_user):
    # Logout returns None with 204
    result = logout(student_user, db_session)
    assert result is None
