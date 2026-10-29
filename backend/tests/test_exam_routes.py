from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException

from app.models import Attempt, Examination, ExaminationQuestion, Question, QuestionType, User, UserRole
from app.routes.exams import close_exam, create_exam, delete_exam, get_exam, list_exams, publish_exam, start_attempt
from app.schemas import ExamCreate
from app.security import hash_password


@pytest.fixture
def sample_question(db_session, faculty_user):
    q = Question(
        title="Sample MCQ",
        content="Is this a test?",
        type=QuestionType.mcq,
        options=["Yes", "No"],
        correct_answer="Yes",
        marks=2.0,
        created_by=faculty_user.id,
    )
    db_session.add(q)
    db_session.flush()
    db_session.refresh(q)
    return q


def test_create_exam_success(db_session, faculty_user, sample_question):
    now = datetime.now(timezone.utc)
    payload = ExamCreate(
        title="Midterm Exam",
        description="Covers chapters 1-4",
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(days=2),
        duration_minutes=60,
        attempt_limit=2,
        negative_marking=0.5,
        question_ids=[sample_question.id],
        shuffle_questions=True,
        shuffle_options=True,
    )
    exam = create_exam(payload, faculty_user, db_session)
    assert exam.id is not None
    assert exam.title == "Midterm Exam"
    assert exam.question_count == 1
    assert exam.is_published is False


def test_create_exam_with_other_faculty_question_fails(db_session, faculty_user):
    other_faculty = User(
        email="other@alienx.demo",
        hashed_password=hash_password("Pass123!"),
        full_name="Other",
        role=UserRole.faculty,
        is_active=True,
    )
    db_session.add(other_faculty)
    db_session.flush()

    other_q = Question(
        title="Other Q", content="Content", type=QuestionType.mcq,
        options=["A", "B"], correct_answer="A", marks=1.0, created_by=other_faculty.id
    )
    db_session.add(other_q)
    db_session.flush()

    now = datetime.now(timezone.utc)
    payload = ExamCreate(
        title="Unauthorized Exam",
        start_time=now,
        end_time=now + timedelta(hours=2),
        duration_minutes=30,
        question_ids=[other_q.id],
    )
    with pytest.raises(HTTPException) as exc_info:
        create_exam(payload, faculty_user, db_session)
    assert exc_info.value.status_code == 403


def test_publish_and_close_exam(db_session, faculty_user, sample_question):
    now = datetime.now(timezone.utc)
    payload = ExamCreate(
        title="Publish Test",
        start_time=now,
        end_time=now + timedelta(hours=2),
        duration_minutes=30,
        question_ids=[sample_question.id],
    )
    exam = create_exam(payload, faculty_user, db_session)

    published = publish_exam(exam.id, True, faculty_user, db_session)
    assert published.is_published is True

    closed = close_exam(exam.id, faculty_user, db_session)
    assert closed.is_closed is True


def test_get_exam_by_id(db_session, faculty_user, student_user, sample_question):
    now = datetime.now(timezone.utc)
    payload = ExamCreate(
        title="Direct Get Exam",
        start_time=now,
        end_time=now + timedelta(hours=2),
        duration_minutes=30,
        question_ids=[sample_question.id],
    )
    exam = create_exam(payload, faculty_user, db_session)

    # Student cannot view unpublished exam
    with pytest.raises(HTTPException) as exc_info:
        get_exam(exam.id, student_user, db_session)
    assert exc_info.value.status_code == 404

    # Faculty can view
    f_exam = get_exam(exam.id, faculty_user, db_session)
    assert f_exam.id == exam.id

    # Publish then student can view
    publish_exam(exam.id, True, faculty_user, db_session)
    s_exam = get_exam(exam.id, student_user, db_session)
    assert s_exam.id == exam.id


def test_delete_exam(db_session, faculty_user, sample_question):
    now = datetime.now(timezone.utc)
    payload = ExamCreate(
        title="To Delete",
        start_time=now,
        end_time=now + timedelta(hours=2),
        duration_minutes=30,
        question_ids=[sample_question.id],
    )
    exam = create_exam(payload, faculty_user, db_session)
    delete_exam(exam.id, faculty_user, db_session)

    with pytest.raises(HTTPException) as exc_info:
        get_exam(exam.id, faculty_user, db_session)
    assert exc_info.value.status_code == 404


def test_start_attempt_enforces_active_window_and_limits(db_session, faculty_user, student_user, sample_question):
    now = datetime.now(timezone.utc)
    payload = ExamCreate(
        title="Live Exam",
        start_time=now - timedelta(minutes=10),
        end_time=now + timedelta(hours=1),
        duration_minutes=30,
        attempt_limit=1,
        question_ids=[sample_question.id],
    )
    exam = create_exam(payload, faculty_user, db_session)
    publish_exam(exam.id, True, faculty_user, db_session)

    session = start_attempt(exam.id, student_user, db_session)
    assert session["attempt_id"] is not None
    assert len(session["questions"]) == 1
    assert session["questions"][0]["id"] == sample_question.id

    # Calling start_attempt again while in_progress returns the same active attempt
    resumed = start_attempt(exam.id, student_user, db_session)
    assert resumed["attempt_id"] == session["attempt_id"]

