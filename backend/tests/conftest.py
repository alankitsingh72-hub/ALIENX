import pytest
from starlette.requests import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # Register all models with Base.metadata
from app.database import Base
from app.models import User, UserRole
from app.routes.auth import limiter
from app.security import hash_password

limiter.enabled = False

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
Base.metadata.create_all(bind=test_engine)
TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def mock_request():
    def _create(path: str = "/api/v1", method: str = "GET"):
        return Request({
            "type": "http",
            "method": method,
            "path": path,
            "headers": [],
            "client": ("127.0.0.1", 12345),
        })
    return _create


@pytest.fixture
def admin_user(db_session):
    user = User(
        email="admin_test@alienx.demo",
        hashed_password=hash_password("Password123!"),
        full_name="Admin Test",
        role=UserRole.admin,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    db_session.refresh(user)
    return user


@pytest.fixture
def faculty_user(db_session):
    user = User(
        email="faculty_test@alienx.demo",
        hashed_password=hash_password("Password123!"),
        full_name="Faculty Test",
        role=UserRole.faculty,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    db_session.refresh(user)
    return user


@pytest.fixture
def student_user(db_session):
    user = User(
        email="student_test@alienx.demo",
        hashed_password=hash_password("Password123!"),
        full_name="Student Test",
        role=UserRole.student,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    db_session.refresh(user)
    return user
