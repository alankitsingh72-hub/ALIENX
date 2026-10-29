import pytest
from fastapi import HTTPException

from app.models import Attempt, Examination, ExaminationQuestion, Question, QuestionType, User, UserRole
from app.routes.questions import create_question, delete_question, list_questions, update_question
from app.schemas import QuestionCreate
from app.security import hash_password


def test_create_mcq_question(db_session, faculty_user):
    payload = QuestionCreate(
        title="SQL Join Types",
        content="Which join returns only matching rows?",
        type=QuestionType.mcq,
        options=["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN"],
        correct_answer="INNER JOIN",
        marks=2.0,
        difficulty="easy",
        tags=["database", "sql"],
    )
    created = create_question(payload, faculty_user, db_session)
    assert created.id is not None
    assert created.title == "SQL Join Types"
    assert created.created_by == faculty_user.id
    assert created.marks == 2.0


def test_create_short_answer_question(db_session, faculty_user):
    payload = QuestionCreate(
        title="Explain ACID",
        content="What does ACID stand for in DBMS?",
        type=QuestionType.short_answer,
        model_answer="Atomicity, Consistency, Isolation, and Durability.",
        keywords=["atomicity", "consistency", "isolation", "durability"],
        marks=4.0,
        difficulty="medium",
        tags=["database"],
    )
    created = create_question(payload, faculty_user, db_session)
    assert created.id is not None
    assert created.type == QuestionType.short_answer
    assert "atomicity" in created.keywords


def test_list_questions_filters_by_faculty_ownership(db_session, faculty_user, admin_user):
    # Create question by faculty
    q_faculty = Question(
        title="Faculty Q", content="Content", type=QuestionType.mcq,
        options=["A", "B"], correct_answer="A", marks=1.0, created_by=faculty_user.id
    )
    # Create question by admin
    q_admin = Question(
        title="Admin Q", content="Content", type=QuestionType.mcq,
        options=["A", "B"], correct_answer="A", marks=1.0, created_by=admin_user.id
    )
    db_session.add_all([q_faculty, q_admin])
    db_session.flush()

    faculty_list = list_questions(None, None, faculty_user, db_session)
    assert len(faculty_list) == 1
    assert faculty_list[0].id == q_faculty.id

    admin_list = list_questions(None, None, admin_user, db_session)
    assert len(admin_list) == 2


def test_update_question_ownership_check(db_session, faculty_user):
    other_faculty = User(
        email="other_faculty@alienx.demo",
        hashed_password=hash_password("Pass123!"),
        full_name="Other Faculty",
        role=UserRole.faculty,
        is_active=True,
    )
    db_session.add(other_faculty)
    db_session.flush()

    q = Question(
        title="Original", content="Content", type=QuestionType.mcq,
        options=["A", "B"], correct_answer="A", marks=1.0, created_by=faculty_user.id
    )
    db_session.add(q)
    db_session.flush()

    payload = QuestionCreate(
        title="Hacked Title", content="Content", type=QuestionType.mcq,
        options=["A", "B"], correct_answer="A", marks=2.0
    )

    with pytest.raises(HTTPException) as exc_info:
        update_question(q.id, payload, other_faculty, db_session)
    assert exc_info.value.status_code == 403


def test_delete_question_soft_deletes(db_session, faculty_user):
    q = Question(
        title="To be deleted", content="Content", type=QuestionType.mcq,
        options=["A", "B"], correct_answer="A", marks=1.0, created_by=faculty_user.id
    )
    db_session.add(q)
    db_session.flush()

    delete_question(q.id, faculty_user, db_session)
    assert q.deleted_at is not None

    visible = list_questions(None, None, faculty_user, db_session)
    assert q.id not in [item.id for item in visible]

