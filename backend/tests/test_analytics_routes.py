from datetime import datetime, timedelta, timezone

from app.models import Answer, Attempt, Examination, ExaminationQuestion, Question, QuestionType
from app.routes.analytics import faculty_analytics


def test_faculty_analytics_summary(db_session, faculty_user, student_user):
    # Create question
    q = Question(
        title="Math Q",
        content="What is 10/2?",
        type=QuestionType.mcq,
        options=["4", "5", "6"],
        correct_answer="5",
        marks=10.0,
        created_by=faculty_user.id,
    )
    db_session.add(q)
    db_session.flush()

    # Create exam
    now = datetime.now(timezone.utc)
    exam = Examination(
        title="Math Exam",
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=1),
        duration_minutes=30,
        attempt_limit=1,
        created_by=faculty_user.id,
    )
    db_session.add(exam)
    db_session.flush()

    eq = ExaminationQuestion(examination_id=exam.id, question_id=q.id, position=0)
    db_session.add(eq)
    db_session.flush()

    # Create submitted attempt with score 10.0 (100%)
    attempt = Attempt(
        student_id=student_user.id,
        examination_id=exam.id,
        status="submitted",
        submitted_at=now,
    )
    db_session.add(attempt)
    db_session.flush()

    ans = Answer(
        attempt_id=attempt.id,
        question_id=q.id,
        selected_option="5",
        auto_score=10.0,
        final_score=10.0,
        review_status="auto_graded",
    )
    db_session.add(ans)
    db_session.flush()

    summary = faculty_analytics(faculty_user, db_session)
    assert "examinations" in summary
    assert len(summary["examinations"]) == 1
    exam_summary = summary["examinations"][0]
    assert exam_summary["title"] == "Math Exam"
    assert exam_summary["attempt_count"] == 1
    assert exam_summary["graded_count"] == 1
    assert exam_summary["average_percentage"] == 100.0
    assert exam_summary["total_marks"] == 10.0

