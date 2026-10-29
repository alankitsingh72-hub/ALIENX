from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import (
    Answer,
    Attempt,
    Course,
    CourseEnrollment,
    Event,
    EventRegistration,
    Examination,
    ExaminationQuestion,
    LabCompletion,
    LabManual,
    PYQPaper,
    PYQQuestion,
    Question,
    QuestionType,
    Subject,
    User,
    UserRole,
)
from app.sample_data import SAMPLE_COURSES, SAMPLE_EVENTS, SAMPLE_QUESTIONS_BY_SUBJECT
from app.security import hash_password

PREPOPULATED_SUBJECTS = [
    {
        "name": "Computer Organization & Architecture",
        "code": "COA",
        "description": "Functional architecture, instruction set architectures, pipelining, cache memory, and I/O subsystem design.",
    },
    {
        "name": "Technical Communication",
        "code": "TC",
        "description": "Professional engineering documentation, report authoring, technical presentations, and workplace communication.",
    },
    {
        "name": "Mathematics",
        "code": "MATH",
        "description": "Linear algebra, multivariable calculus, numerical analysis, and probability for computer science.",
    },
    {
        "name": "Python Programming",
        "code": "PYPROG",
        "description": "Python language paradigms, OOP, standard libraries, functional constructs, and modern software development.",
    },
    {
        "name": "C Programming",
        "code": "CPROG",
        "description": "Procedural programming, pointer arithmetic, memory layout, system-level primitives, and data buffers in C.",
    },
    {
        "name": "Soft Skills",
        "code": "SOFTSKILLS",
        "description": "Interpersonal competence, team leadership, conflict resolution, negotiation, and professional ethics.",
    },
    {
        "name": "Discrete Structures & Theory of Logic (DSTL)",
        "code": "DSTL",
        "description": "Propositional logic, predicate calculus, sets, relations, graph theory, lattices, and boolean algebras.",
    },
    {
        "name": "Web Development",
        "code": "WEBDEV",
        "description": "Modern full-stack web systems, REST APIs, TypeScript, React, responsive layouts, and distributed frontends.",
    },
    {
        "name": "Data Structures",
        "code": "DSA",
        "description": "Linear and non-linear data structures, trees, graphs, sorting, searching, and algorithmic asymptotic complexity.",
    },
    {
        "name": "Operating Systems",
        "code": "OS",
        "description": "Process management, virtual memory, concurrency, file systems, synchronization primitives, and CPU scheduling.",
    },
    {
        "name": "Database Management Systems",
        "code": "DBMS",
        "description": "Relational calculus, SQL, normalization, concurrency control, transaction ACID properties, and indexing.",
    },
    {
        "name": "Software Engineering",
        "code": "SE",
        "description": "Software lifecycle models, agile methodologies, requirements engineering, architecture design, and automated QA.",
    },
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        # 1. Seed demo users
        users = {}
        for email, name, role in (
            ("admin@alienx.demo", "ALIENX Administrator", UserRole.admin),
            ("faculty@alienx.demo", "Dr. Ada Faculty", UserRole.faculty),
            ("student@alienx.demo", "Alex Student", UserRole.student),
        ):
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(email=email, full_name=name, role=role, hashed_password=hash_password("AlienxDemo!2026"))
                db.add(user)
                db.flush()
            users[email] = user
        db.commit()

        faculty = users["faculty@alienx.demo"]
        student = users["student@alienx.demo"]

        # 2. Seed Subjects
        subjects_map = {}
        for sub_data in PREPOPULATED_SUBJECTS:
            subject = db.scalar(select(Subject).where(Subject.code == sub_data["code"]))
            if subject is None:
                subject = Subject(
                    name=sub_data["name"],
                    code=sub_data["code"],
                    description=sub_data["description"],
                    created_by=faculty.id,
                )
                db.add(subject)
                db.flush()
            subjects_map[sub_data["code"]] = subject
        db.commit()

        # 3. Seed 10 sample questions per major subject (5 MCQ + 5 Subjective)
        for code, q_list in SAMPLE_QUESTIONS_BY_SUBJECT.items():
            sub = subjects_map.get(code)
            if not sub:
                continue
            for item in q_list:
                existing = db.scalar(select(Question).where(Question.title == item["title"]))
                if existing is None:
                    q = Question(
                        subject_id=sub.id,
                        title=item["title"],
                        content=item["content"],
                        type=item.get("type", QuestionType.mcq),
                        options=item.get("options"),
                        correct_answer=item.get("correct_answer"),
                        model_answer=item.get("model_answer"),
                        keywords=item.get("keywords", []),
                        explanation=item.get("explanation"),
                        marks=item.get("marks", 2.0),
                        difficulty=item.get("difficulty", "medium"),
                        is_hots=item.get("is_hots", False),
                        tags=item.get("tags", []),
                        created_by=faculty.id,
                    )
                    db.add(q)
                else:
                    existing.subject_id = sub.id
                    existing.difficulty = item.get("difficulty", "medium")
                    existing.is_hots = item.get("is_hots", False)
                    existing.marks = item.get("marks", existing.marks)
        db.commit()

        # 4. Seed Events (Quizathon, Hackathon, Ideathon, Buildathon, Innovathon)
        event_objects = []
        for ev in SAMPLE_EVENTS:
            existing_ev = db.scalar(select(Event).where(Event.title == ev["title"]))
            if existing_ev is None:
                event_obj = Event(**ev, created_by=faculty.id)
                db.add(event_obj)
                event_objects.append(event_obj)
            else:
                event_objects.append(existing_ev)
        db.commit()

        # 5. Seed Certification Courses
        course_objects = []
        for c in SAMPLE_COURSES:
            existing_c = db.scalar(select(Course).where(Course.code == c["code"]))
            if existing_c is None:
                course_obj = Course(**c, created_by=faculty.id)
                db.add(course_obj)
                course_objects.append(course_obj)
            else:
                course_objects.append(existing_c)
        db.commit()

        # 6. Seed Student Course Enrollments & Certificates
        fsw_course = db.scalar(select(Course).where(Course.code == "FSW-101"))
        if fsw_course:
            enr1 = db.scalar(
                select(CourseEnrollment).where(
                    CourseEnrollment.course_id == fsw_course.id,
                    CourseEnrollment.user_id == student.id,
                )
            )
            if not enr1:
                enr1 = CourseEnrollment(
                    course_id=fsw_course.id,
                    user_id=student.id,
                    progress_percentage=100,
                    completed_modules=["m1", "m2", "m3", "m4"],
                    status="completed",
                    certificate_id="ALX-CERT-FSW-101-88A9F2",
                    enrolled_at=datetime.now(timezone.utc) - timedelta(days=14),
                    completed_at=datetime.now(timezone.utc) - timedelta(days=2),
                )
                db.add(enr1)

        asd_course = db.scalar(select(Course).where(Course.code == "ASD-201"))
        if asd_course:
            enr2 = db.scalar(
                select(CourseEnrollment).where(
                    CourseEnrollment.course_id == asd_course.id,
                    CourseEnrollment.user_id == student.id,
                )
            )
            if not enr2:
                enr2 = CourseEnrollment(
                    course_id=asd_course.id,
                    user_id=student.id,
                    progress_percentage=50,
                    completed_modules=["m1", "m2"],
                    status="in_progress",
                    enrolled_at=datetime.now(timezone.utc) - timedelta(days=5),
                )
                db.add(enr2)
        db.commit()

        # 7. Seed Student Event Registrations
        hackathon = db.scalar(select(Event).where(Event.event_type == "Hackathon"))
        if hackathon:
            reg_hack = db.scalar(
                select(EventRegistration).where(
                    EventRegistration.event_id == hackathon.id,
                    EventRegistration.user_id == student.id,
                )
            )
            if not reg_hack:
                db.add(EventRegistration(event_id=hackathon.id, user_id=student.id, status="registered"))

        quizathon = db.scalar(select(Event).where(Event.event_type == "Quizathon"))
        if quizathon:
            reg_quiz = db.scalar(
                select(EventRegistration).where(
                    EventRegistration.event_id == quizathon.id,
                    EventRegistration.user_id == student.id,
                )
            )
            if not reg_quiz:
                db.add(EventRegistration(event_id=quizathon.id, user_id=student.id, status="registered"))
        db.commit()

        # 8. Seed Examinations & Link Questions
        now = datetime.now(timezone.utc)
        dbms = subjects_map["DBMS"]
        dsa = subjects_map["DSA"]
        pyprog = subjects_map["PYPROG"]
        os_sub = subjects_map["OS"]

        exams_data = [
            ("Database Systems - Foundations", dbms.id, 45, 0.5),
            ("Data Structures & Algorithms Midterm", dsa.id, 60, 0.0),
            ("Python Programming Proficiency", pyprog.id, 30, 0.25),
            ("Operating Systems Architecture & Concurrency", os_sub.id, 45, 0.5),
        ]

        created_exams = {}
        for title, sub_id, dur, neg in exams_data:
            ex = db.scalar(select(Examination).where(Examination.title == title))
            if not ex:
                ex = Examination(
                    subject_id=sub_id,
                    title=title,
                    description=f"Standard academic assessment for {title}.",
                    start_time=now - timedelta(days=10),
                    end_time=now + timedelta(days=30),
                    duration_minutes=dur,
                    attempt_limit=3,
                    negative_marking=neg,
                    is_published=True,
                    shuffle_questions=True,
                    shuffle_options=True,
                    created_by=faculty.id,
                )
                db.add(ex)
                db.flush()
            created_exams[title] = ex

            # Link subject questions to exam
            eq_count = db.scalar(select(ExaminationQuestion).where(ExaminationQuestion.examination_id == ex.id))
            if not eq_count:
                sub_qs = list(db.scalars(select(Question).where(Question.subject_id == sub_id).limit(6)))
                for idx, q in enumerate(sub_qs):
                    db.add(ExaminationQuestion(examination_id=ex.id, question_id=q.id, position=idx))
        db.commit()

        # 9. Seed Student Quiz History Attempts (DSA: 92%, DBMS: 88%, Python: 78%, OS: 62%)
        student_attempts = list(db.scalars(select(Attempt).where(Attempt.student_id == student.id)))
        if len(student_attempts) < 4:
            # Attempt 1: DBMS (88%)
            dbms_exam = created_exams["Database Systems - Foundations"]
            att1 = Attempt(
                student_id=student.id,
                examination_id=dbms_exam.id,
                started_at=now - timedelta(days=6, hours=3),
                submitted_at=now - timedelta(days=6, hours=2, minutes=20),
                status="completed",
                time_spent_seconds=2400,
            )
            db.add(att1)
            db.flush()
            for eq in db.scalars(select(ExaminationQuestion).where(ExaminationQuestion.examination_id == dbms_exam.id)):
                q = db.get(Question, eq.question_id)
                if not q:
                    continue
                score = q.marks if q.type == QuestionType.mcq else round(q.marks * 0.85, 1)
                db.add(Answer(
                    attempt_id=att1.id,
                    question_id=q.id,
                    selected_option=q.correct_answer if q.type == QuestionType.mcq else None,
                    answer_text=q.model_answer if q.type != QuestionType.mcq else None,
                    auto_score=score,
                    final_score=score,
                    confidence=0.92,
                    review_status="reviewed",
                    feedback="Solid understanding demonstrated.",
                ))

            # Attempt 2: DSA (92%)
            dsa_exam = created_exams["Data Structures & Algorithms Midterm"]
            att2 = Attempt(
                student_id=student.id,
                examination_id=dsa_exam.id,
                started_at=now - timedelta(days=4, hours=5),
                submitted_at=now - timedelta(days=4, hours=4),
                status="completed",
                time_spent_seconds=3600,
            )
            db.add(att2)
            db.flush()
            for eq in db.scalars(select(ExaminationQuestion).where(ExaminationQuestion.examination_id == dsa_exam.id)):
                q = db.get(Question, eq.question_id)
                if not q:
                    continue
                score = q.marks if q.type == QuestionType.mcq else round(q.marks * 0.90, 1)
                db.add(Answer(
                    attempt_id=att2.id,
                    question_id=q.id,
                    selected_option=q.correct_answer if q.type == QuestionType.mcq else None,
                    answer_text=q.model_answer if q.type != QuestionType.mcq else None,
                    auto_score=score,
                    final_score=score,
                    confidence=0.95,
                    review_status="reviewed",
                    feedback="Exceptional algorithmic rigor.",
                ))

            # Attempt 3: Python (78%)
            py_exam = created_exams["Python Programming Proficiency"]
            att3 = Attempt(
                student_id=student.id,
                examination_id=py_exam.id,
                started_at=now - timedelta(days=2, hours=2),
                submitted_at=now - timedelta(days=2, hours=1, minutes=35),
                status="completed",
                time_spent_seconds=1500,
            )
            db.add(att3)
            db.flush()
            for eq in db.scalars(select(ExaminationQuestion).where(ExaminationQuestion.examination_id == py_exam.id)):
                q = db.get(Question, eq.question_id)
                if not q:
                    continue
                score = q.marks if q.type == QuestionType.mcq else round(q.marks * 0.75, 1)
                db.add(Answer(
                    attempt_id=att3.id,
                    question_id=q.id,
                    selected_option=q.correct_answer if q.type == QuestionType.mcq else None,
                    answer_text=q.model_answer if q.type != QuestionType.mcq else None,
                    auto_score=score,
                    final_score=score,
                    confidence=0.82,
                    review_status="reviewed",
                    feedback="Good grasp of language mechanics.",
                ))

            # Attempt 4: OS (62% - Weaker Area)
            os_exam = created_exams["Operating Systems Architecture & Concurrency"]
            att4 = Attempt(
                student_id=student.id,
                examination_id=os_exam.id,
                started_at=now - timedelta(hours=14),
                submitted_at=now - timedelta(hours=13, minutes=15),
                status="completed",
                time_spent_seconds=2700,
            )
            db.add(att4)
            db.flush()
            for idx, eq in enumerate(db.scalars(select(ExaminationQuestion).where(ExaminationQuestion.examination_id == os_exam.id))):
                q = db.get(Question, eq.question_id)
                if not q:
                    continue
                # Intentionally lower score on OS to demonstrate Weaker Area detection in progress dashboard
                score = q.marks if (idx % 2 == 0 and q.type == QuestionType.mcq) else round(q.marks * 0.55, 1)
                db.add(Answer(
                    attempt_id=att4.id,
                    question_id=q.id,
                    selected_option=q.correct_answer if idx % 2 == 0 else (q.options[1] if q.options and len(q.options) > 1 else None),
                    answer_text="Process synchronization uses semaphores and mutexes to prevent race conditions." if q.type != QuestionType.mcq else None,
                    auto_score=score,
                    final_score=score,
                    confidence=0.70,
                    review_status="reviewed",
                    feedback="Review memory thrashing and inverted page table mechanisms.",
                ))
            db.commit()

        # 10. Seed PYQ Papers & Questions
        if db.scalar(select(PYQPaper)) is None:
            paper_dbms = PYQPaper(
                subject_id=dbms.id,
                title="DBMS End-Semester Examination 2024",
                year=2024,
                exam_type="End-Term",
                university="Apex Technical University",
                description="Final university examination paper including relational calculus, BCNF proofs, and query optimization.",
                file_url="https://alienx.demo/papers/dbms-2024.pdf",
                created_by=faculty.id,
            )
            paper_dsa = PYQPaper(
                subject_id=dsa.id,
                title="Data Structures Mid-Semester Assessment 2023",
                year=2023,
                exam_type="Mid-Term",
                university="Apex Technical University",
                description="Standard midterm test on dynamic arrays, AVL tree rotations, and DFS/BFS graph cycles.",
                file_url="https://alienx.demo/papers/dsa-2023.pdf",
                created_by=faculty.id,
            )
            db.add_all([paper_dbms, paper_dsa])
            db.flush()

            db.add(PYQQuestion(
                paper_id=paper_dbms.id,
                subject_id=dbms.id,
                year=2024,
                question_text="Compare Boyce-Codd Normal Form (BCNF) with Third Normal Form (3NF). When is a 3NF relation not in BCNF?",
                marks=7.0,
                question_type="descriptive",
                solution="A relation is in 3NF if for every dependency X -> A, either X is a superkey or A is a prime attribute. BCNF strictly requires X to be a superkey.",
                difficulty="medium",
                tags=["dbms", "normalization", "bcnf"],
                created_by=faculty.id,
            ))
            db.commit()

        # 11. Seed Lab Manuals & Student Completion
        if db.scalar(select(LabManual)) is None:
            manual_dbms = LabManual(
                subject_id=dbms.id,
                title="Lab 1: Schema Definition and Relational Constraints",
                lab_number=1,
                objectives="Design and deploy an enterprise relational schema enforcing primary, foreign key, check, and unique constraints.",
                theory="Relational databases use declarative DDL and integrity constraints to maintain consistency.",
                procedure="1. Connect to PostgreSQL shell.\n2. Write DDL statements with appropriate constraints.\n3. Verify constraint enforcement with test inserts.",
                sample_code="CREATE TABLE departments (\n    id SERIAL PRIMARY KEY,\n    name VARCHAR(100) NOT NULL UNIQUE\n);",
                programming_language="sql",
                expected_output="CREATE TABLE\nQuery returned successfully with 0 rows.",
                viva_questions=[
                    {"question": "What is the difference between UNIQUE and PRIMARY KEY?", "answer": "Primary keys reject NULLs and only one exists per table."},
                ],
                file_url="https://alienx.demo/labs/dbms-lab1.pdf",
                created_by=faculty.id,
            )
            db.add(manual_dbms)
            db.flush()
            db.add(LabCompletion(student_id=student.id, manual_id=manual_dbms.id))
            db.commit()

        print("ALIENX database successfully seeded with all 12 Subjects, 120 Questions (Difficulty + HOTS), Events, Courses, and Student Progress data!")


if __name__ == "__main__":
    seed()
