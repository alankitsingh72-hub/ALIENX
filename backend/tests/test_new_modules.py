from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException

from app.models import (
    Answer,
    Attempt,
    Examination,
    ExaminationQuestion,
    LabCompletion,
    LabManual,
    PYQPaper,
    PYQQuestion,
    Question,
    QuestionType,
    Subject,
    UserRole,
)
from app.routes.ai import generate_questions
from app.routes.analytics import admin_faculty_analytics, student_analytics
from app.routes.labs import create_lab_manual, list_lab_manuals, toggle_lab_completion
from app.routes.pyq import create_pyq_paper, create_pyq_question, list_pyq_papers, list_pyq_questions
from app.routes.subjects import create_subject, delete_subject, list_subjects, update_subject
from app.schemas import AIGenerateRequest, LabManualCreate, PYQPaperCreate, PYQQuestionCreate, SubjectCreate


def test_subject_crud(db_session, admin_user, faculty_user, student_user):
    # Faculty creates subject
    created = create_subject(
        SubjectCreate(name="Cloud Computing", code="CLOUD", description="Distributed cloud systems"),
        faculty_user,
        db_session,
    )
    assert created.id is not None
    assert created.code == "CLOUD"

    # List subjects
    all_subs = list_subjects(None, student_user, db_session)
    assert any(s.code == "CLOUD" for s in all_subs)

    # Faculty updates subject
    updated = update_subject(
        created.id,
        SubjectCreate(name="Cloud Computing Advanced", code="CLOUD", description="Updated description"),
        faculty_user,
        db_session,
    )
    assert updated.name == "Cloud Computing Advanced"

    # Admin deletes subject
    delete_subject(created.id, admin_user, db_session)

    all_subs_after = list_subjects(None, student_user, db_session)
    assert not any(s.code == "CLOUD" for s in all_subs_after)


def test_student_performance_analytics(db_session, faculty_user, student_user):
    sub = Subject(name="Operating Systems", code="OS", description="Core OS", created_by=faculty_user.id)
    db_session.add(sub)
    db_session.flush()

    q = Question(
        subject_id=sub.id,
        title="Page Replacement",
        content="Which is an optimal page replacement algorithm?",
        type=QuestionType.mcq,
        options=["FIFO", "LRU", "OPT"],
        correct_answer="OPT",
        marks=5.0,
        created_by=faculty_user.id,
    )
    db_session.add(q)
    db_session.flush()

    now = datetime.now(timezone.utc)
    exam = Examination(
        subject_id=sub.id,
        title="OS Paging Assessment",
        start_time=now,
        end_time=now + timedelta(hours=2),
        duration_minutes=30,
        created_by=faculty_user.id,
    )
    db_session.add(exam)
    db_session.flush()

    db_session.add(ExaminationQuestion(examination_id=exam.id, question_id=q.id, position=0))
    db_session.flush()

    att = Attempt(
        student_id=student_user.id,
        examination_id=exam.id,
        status="submitted",
        submitted_at=now,
        time_spent_seconds=600,
    )
    db_session.add(att)
    db_session.flush()

    ans = Answer(
        attempt_id=att.id,
        question_id=q.id,
        selected_option="OPT",
        final_score=5.0,
        review_status="reviewed",
    )
    db_session.add(ans)
    db_session.commit()

    analytics = student_analytics(student_id=None, subject_id=None, user=student_user, db=db_session)
    assert analytics["overall"]["total_attempts"] == 1
    assert analytics["overall"]["average_percentage"] == 100.0
    assert len(analytics["subject_bars"]) == 1
    assert analytics["subject_bars"][0]["subject_code"] == "OS"
    assert analytics["strongest_subject"] == "Operating Systems"
    assert analytics["question_type_stats"]["mcq"]["correct"] == 1


def test_pyq_modules(db_session, faculty_user, student_user):
    sub = Subject(name="Web Engineering", code="WEB", description="Web", created_by=faculty_user.id)
    db_session.add(sub)
    db_session.flush()

    paper = create_pyq_paper(
        PYQPaperCreate(subject_id=sub.id, title="Web Tech End-Term 2024", year=2024, exam_type="End-Term"),
        faculty_user,
        db_session,
    )
    assert paper.id is not None

    q = create_pyq_question(
        PYQQuestionCreate(
            subject_id=sub.id,
            paper_id=paper.id,
            year=2024,
            question_text="Explain CSS Flexbox vs Grid.",
            marks=5.0,
            question_type="short_answer",
            solution="Flexbox is 1-dimensional, Grid is 2-dimensional.",
        ),
        faculty_user,
        db_session,
    )
    assert q.id is not None

    papers = list_pyq_papers(subject_id=sub.id, year=2024, exam_type=None, search=None, user=student_user, db=db_session)
    assert len(papers) == 1
    assert papers[0].title == "Web Tech End-Term 2024"


def test_lab_manuals_and_completion(db_session, faculty_user, student_user):
    sub = Subject(name="Database Systems", code="DBMS_LAB", description="DB Lab", created_by=faculty_user.id)
    db_session.add(sub)
    db_session.flush()

    manual = create_lab_manual(
        LabManualCreate(
            subject_id=sub.id,
            title="Lab 1: SQL Joins",
            lab_number=1,
            objectives="Master INNER, LEFT, and RIGHT joins.",
            sample_code="SELECT * FROM a INNER JOIN b ON a.id = b.a_id;",
            programming_language="sql",
        ),
        faculty_user,
        db_session,
    )
    assert manual.id is not None

    # Student toggles completion
    res1 = toggle_lab_completion(manual.id, student_user, db_session)
    assert res1["is_completed"] is True

    # List manuals for student verifies completion status
    listed = list_lab_manuals(subject_id=sub.id, search=None, user=student_user, db=db_session)
    assert len(listed) == 1
    assert listed[0].is_completed is True

    # Toggle off
    res2 = toggle_lab_completion(manual.id, student_user, db_session)
    assert res2["is_completed"] is False


def test_ai_question_generation(db_session, faculty_user):
    sub = Subject(name="Data Structures", code="DSA", description="DSA", created_by=faculty_user.id)
    db_session.add(sub)
    db_session.flush()

    req = AIGenerateRequest(
        subject_id=sub.id,
        topic="Binary Search Tree",
        difficulty="medium",
        question_type=QuestionType.mcq,
        count=3,
    )
    resp = generate_questions(req, faculty_user, db_session)
    assert resp.subject_id == sub.id
    assert resp.subject_name == "Data Structures"
    assert len(resp.questions) == 3
    for q in resp.questions:
        assert q.type == QuestionType.mcq
        assert q.options is not None
        assert q.correct_answer is not None
        assert "binary search tree" in q.title.lower() or "binary search tree" in q.content.lower()
