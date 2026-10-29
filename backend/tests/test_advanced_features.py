from datetime import datetime, timedelta, timezone

from app.models import Course, Event, Question, QuestionType, Subject, UserRole
from app.routes.courses import create_course, enroll_course, list_courses, update_course_progress, verify_certificate
from app.routes.events import create_event, list_events, toggle_event_registration
from app.routes.questions import list_hots_questions, list_questions
from app.routes.resume import analyze_resume_text, extract_skills_from_text, save_resume_questions_to_bank
from app.schemas import CourseCreate, CourseProgressUpdate, EventCreate, QuestionCreate, ResumeAnalyzeRequest


def test_events_lifecycle(db_session, faculty_user, student_user):
    now = datetime.now(timezone.utc)
    ev_create = EventCreate(
        title="Inter-University Quizathon",
        event_type="Quizathon",
        description="Fast-paced technical trivia challenge",
        rules="No electronic aids allowed",
        prizes="$1,000 to top scorer",
        start_time=now + timedelta(days=1),
        end_time=now + timedelta(days=1, hours=3),
        duration="3 Hours",
        max_participants=50,
        is_published=True,
    )
    ev = create_event(ev_create, faculty_user, db_session)
    assert ev.id is not None
    assert ev.status == "upcoming"

    # List events as student
    upcoming_events = list_events("upcoming", None, student_user, db_session)
    assert any(e.id == ev.id for e in upcoming_events)

    # Student registers
    res_reg = toggle_event_registration(ev.id, student_user, db_session)
    assert res_reg["registered"] is True

    # Student unregisters
    res_unreg = toggle_event_registration(ev.id, student_user, db_session)
    assert res_unreg["registered"] is False


def test_courses_and_certificates(db_session, faculty_user, student_user):
    course_data = CourseCreate(
        title="Cloud Native Architectures",
        code="CNA-501",
        description="Kubernetes, microservices, and serverless architectures.",
        duration_hours=16,
        level="Advanced",
        skills_covered=["Kubernetes", "Docker", "Go", "Microservices"],
        syllabus=[
            {"id": "m1", "title": "Container primitives", "description": "Namespaces and cgroups", "duration": "4h"},
            {"id": "m2", "title": "Orchestration", "description": "Deployments, services, and ingresses", "duration": "4h"},
        ],
        is_published=True,
    )
    course = create_course(course_data, faculty_user, db_session)
    assert course.id is not None

    # Student enrolls
    enr = enroll_course(course.id, student_user, db_session)
    assert enr.status == "enrolled"
    assert enr.progress_percentage == 0

    # Progress update to 100% -> generates certificate
    progress_res = update_course_progress(
        course.id,
        CourseProgressUpdate(completed_module_id="m1", progress_percentage=100),
        student_user,
        db_session,
    )
    assert progress_res.status == "completed"
    assert progress_res.certificate_id is not None
    assert "ALX-CERT-CNA-501" in progress_res.certificate_id

    # Verify certificate
    cert = verify_certificate(progress_res.certificate_id, db_session)
    assert cert["valid"] is True
    assert cert["course_title"] == "Cloud Native Architectures"
    assert cert["recipient_name"] == student_user.full_name


def test_resume_qa_generator(db_session, faculty_user, student_user):
    resume_text = """
    Jane Doe - Senior Full Stack Software Engineer
    Experienced in building distributed web applications with Python, FastAPI, React, PostgreSQL, Docker, and Redis.
    Designed event-driven microservices handling 25,000 requests/second with 99.99% availability.
    Expert in algorithms, data structures, and database query optimization using EXPLAIN ANALYZE.
    """
    skills = extract_skills_from_text(resume_text)
    assert "Python" in skills
    assert "FastAPI" in skills
    assert "React" in skills
    assert "PostgreSQL" in skills

    payload = ResumeAnalyzeRequest(
        resume_text=resume_text,
        target_role="Full Stack Architect",
        candidate_name="Jane Doe",
    )
    res = analyze_resume_text(payload, student_user, db_session)
    assert len(res.questions) >= 4
    assert any(q.category == "technical" for q in res.questions)
    assert any(q.category == "behavioral" for q in res.questions)
    assert any(q.category == "system_design" for q in res.questions)

    # Save to question bank
    sub = Subject(name="Web & Cloud", code="WC", description="Web and cloud", created_by=faculty_user.id)
    db_session.add(sub)
    db_session.flush()

    q_create = [
        QuestionCreate(
            subject_id=sub.id,
            title=res.questions[0].title,
            content=res.questions[0].content,
            type=res.questions[0].type,
            model_answer=res.questions[0].model_answer,
            marks=res.questions[0].marks,
            difficulty=res.questions[0].difficulty,
            tags=["resume-generated", "technical"],
        )
    ]
    saved = save_resume_questions_to_bank(q_create, faculty_user, db_session)
    assert len(saved) == 1
    assert saved[0].subject_id == sub.id


def test_hots_questions_and_filtering(db_session, faculty_user, student_user):
    sub = Subject(name="Theoretical CS", code="TCS", description="TCS", created_by=faculty_user.id)
    db_session.add(sub)
    db_session.flush()

    q_hots = Question(
        subject_id=sub.id,
        title="P vs NP Formal Proof",
        content="Analyze the Cook-Levin theorem and demonstrate SAT polynomial-time reductions.",
        type=QuestionType.descriptive,
        model_answer="Cook-Levin proves that Boolean satisfiability is NP-complete by simulating non-deterministic Turing machines.",
        marks=10.0,
        difficulty="tough",
        is_hots=True,
        created_by=faculty_user.id,
    )
    q_standard = Question(
        subject_id=sub.id,
        title="Binary Representation",
        content="What is binary 101 in decimal?",
        type=QuestionType.mcq,
        options=["4", "5", "6"],
        correct_answer="5",
        marks=2.0,
        difficulty="easy",
        is_hots=False,
        created_by=faculty_user.id,
    )
    db_session.add_all([q_hots, q_standard])
    db_session.flush()

    # Query HOTS questions
    hots_list = list_hots_questions(sub.id, None, None, student_user, db_session)
    assert any(q.title == "P vs NP Formal Proof" for q in hots_list)
    assert not any(q.title == "Binary Representation" for q in hots_list)

    # Filter question bank by difficulty
    tough_qs = list_questions(None, None, faculty_user, db_session, sub.id, "tough", None)
    assert any(q.title == "P vs NP Formal Proof" for q in tough_qs)
    assert not any(q.title == "Binary Representation" for q in tough_qs)

