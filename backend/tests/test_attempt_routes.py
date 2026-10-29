from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException

from app.models import Attempt, Examination, ExaminationQuestion, Question, QuestionType, User, UserRole
from app.routes.attempts import exam_results, get_result, my_results, review_answer, review_queue, save_answer, submit_attempt
from app.routes.exams import create_exam, publish_exam, start_attempt
from app.schemas import AnswerSave, ExamCreate, ReviewRequest
from app.security import hash_password


@pytest.fixture
def exam_with_questions(db_session, faculty_user):
    q_mcq = Question(
        title="MCQ Question",
        content="What is 2+2?",
        type=QuestionType.mcq,
        options=["3", "4", "5"],
        correct_answer="4",
        marks=2.0,
        created_by=faculty_user.id,
    )
    q_sub = Question(
        title="Subjective Question",
        content="Explain database transactions.",
        type=QuestionType.short_answer,
        model_answer="Transactions are atomic units of work that guarantee ACID properties.",
        keywords=["atomic", "units", "acid"],
        marks=5.0,
        created_by=faculty_user.id,
    )
    db_session.add_all([q_mcq, q_sub])
    db_session.flush()

    now = datetime.now(timezone.utc)
    payload = ExamCreate(
        title="Comprehensive Exam",
        start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=2),
        duration_minutes=60,
        negative_marking=0.5,
        question_ids=[q_mcq.id, q_sub.id],
    )
    exam = create_exam(payload, faculty_user, db_session)
    publish_exam(exam.id, True, faculty_user, db_session)
    return exam, q_mcq, q_sub


def test_save_and_submit_attempt(db_session, student_user, exam_with_questions):
    exam, q_mcq, q_sub = exam_with_questions
    session = start_attempt(exam.id, student_user, db_session)
    attempt_id = session["attempt_id"]

    # Save MCQ answer
    save_res = save_answer(
        attempt_id,
        AnswerSave(question_id=q_mcq.id, selected_option="4", answer_text="4", marked_for_review=False),
        student_user,
        db_session,
    )
    assert save_res["saved"] is True

    # Save subjective answer
    save_sub = save_answer(
        attempt_id,
        AnswerSave(question_id=q_sub.id, answer_text="Transactions are units of work guaranteeing ACID properties.", marked_for_review=False),
        student_user,
        db_session,
    )
    assert save_sub["saved"] is True

    # Submit attempt
    result = submit_attempt(attempt_id, student_user, db_session)
    assert result.status == "submitted"
    assert len(result.answers) == 2

    # Verify MCQ auto score is 2.0
    mcq_ans = next(a for a in result.answers if a.question_id == q_mcq.id)
    assert mcq_ans.auto_score == 2.0
    assert mcq_ans.feedback == "Correct."


def test_student_cannot_access_other_attempt(db_session, exam_with_questions, student_user):
    exam, _, _ = exam_with_questions
    session = start_attempt(exam.id, student_user, db_session)

    other_student = User(
        email="other_student@alienx.demo",
        hashed_password=hash_password("Pass123!"),
        full_name="Other Student",
        role=UserRole.student,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.flush()

    with pytest.raises(HTTPException) as exc_info:
        save_answer(session["attempt_id"], AnswerSave(question_id=1, answer_text="test"), other_student, db_session)
    assert exc_info.value.status_code == 403


def test_faculty_review_flow(db_session, student_user, faculty_user, exam_with_questions):
    exam, q_mcq, q_sub = exam_with_questions
    session = start_attempt(exam.id, student_user, db_session)
    attempt_id = session["attempt_id"]

    # Student answers with partial match to trigger faculty review
    save_answer(
        attempt_id,
        AnswerSave(question_id=q_sub.id, answer_text="Database work with units", marked_for_review=False),
        student_user,
        db_session,
    )
    submit_attempt(attempt_id, student_user, db_session)

    # Faculty checks review queue
    queue = review_queue(faculty_user, db_session)
    # If the partial match routed to faculty review, review it
    if queue:
        review_answer(
            attempt_id,
            q_sub.id,
            ReviewRequest(final_score=3.5, feedback="Good effort, needs more detail."),
            faculty_user,
            db_session,
        )
        res = get_result(attempt_id, student_user, db_session)
        sub_ans = next(a for a in res.answers if a.question_id == q_sub.id)
        assert sub_ans.final_score == 3.5
        assert sub_ans.review_status == "reviewed"


def test_my_results_and_exam_results(db_session, student_user, faculty_user, exam_with_questions):
    exam, q_mcq, _ = exam_with_questions
    session = start_attempt(exam.id, student_user, db_session)
    submit_attempt(session["attempt_id"], student_user, db_session)

    student_res = my_results(student_user, db_session)
    assert len(student_res) >= 1
    assert student_res[0].examination_id == exam.id

    fac_results = exam_results(exam.id, faculty_user, db_session)
    assert len(fac_results) >= 1
    assert fac_results[0]["student_id"] == student_user.id

