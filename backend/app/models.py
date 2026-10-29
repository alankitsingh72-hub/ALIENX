import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, Enum, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

JSON_DOCUMENT = JSON().with_variant(JSONB(), "postgresql")


class UserRole(str, enum.Enum):
    admin = "admin"
    faculty = "faculty"
    student = "student"


class QuestionType(str, enum.Enum):
    mcq = "mcq"
    short_answer = "short_answer"
    descriptive = "descriptive"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="userrole"))
    full_name: Mapped[str] = mapped_column(String(160))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Subject(Base):
    __tablename__ = "subjects"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Question(Base):
    __tablename__ = "questions"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(240))
    content: Mapped[str] = mapped_column(Text)
    type: Mapped[QuestionType] = mapped_column(Enum(QuestionType, name="questiontype"))
    options: Mapped[list[str] | None] = mapped_column(JSON_DOCUMENT, nullable=True)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    keywords: Mapped[list[str]] = mapped_column(JSON_DOCUMENT, default=list)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    marks: Mapped[float] = mapped_column(Float)
    difficulty: Mapped[str] = mapped_column(String(24), default="medium")
    is_hots: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    tags: Mapped[list[str]] = mapped_column(JSON_DOCUMENT, default=list)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    subject: Mapped[Subject | None] = relationship(lazy="joined")


class Examination(Base):
    __tablename__ = "examinations"
    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_exam_duration_positive"),
        CheckConstraint("attempt_limit > 0", name="ck_exam_attempt_limit_positive"),
        CheckConstraint("end_time > start_time", name="ck_exam_time_order"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text, default="")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int] = mapped_column(Integer)
    attempt_limit: Mapped[int] = mapped_column(Integer, default=1)
    negative_marking: Mapped[float] = mapped_column(Float, default=0.0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    questions: Mapped[list["ExaminationQuestion"]] = relationship(
        back_populates="examination", cascade="all, delete-orphan", order_by="ExaminationQuestion.position"
    )

    subject: Mapped[Subject | None] = relationship(lazy="joined")


class ExaminationQuestion(Base):
    __tablename__ = "examination_questions"
    __table_args__ = (
        UniqueConstraint("examination_id", "question_id", name="uq_exam_question"),
        UniqueConstraint("examination_id", "position", name="uq_exam_position"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    examination_id: Mapped[int] = mapped_column(ForeignKey("examinations.id", ondelete="CASCADE"))
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    position: Mapped[int] = mapped_column(Integer)
    examination: Mapped[Examination] = relationship(back_populates="questions")
    question: Mapped[Question] = relationship()


class Attempt(Base):
    __tablename__ = "attempts"
    __table_args__ = (
        Index("ix_attempt_student_exam", "student_id", "examination_id"),
        Index(
            "uq_active_attempt_student_exam",
            "student_id",
            "examination_id",
            unique=True,
            postgresql_where=text("status = 'in_progress'"),
            sqlite_where=text("status = 'in_progress'"),
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    examination_id: Mapped[int] = mapped_column(ForeignKey("examinations.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="in_progress")
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    question_order: Mapped[list[int] | None] = mapped_column(JSON_DOCUMENT, nullable=True)
    option_orders: Mapped[dict[str, list[str]]] = mapped_column(JSON_DOCUMENT, default=dict)

    examination: Mapped[Examination] = relationship(lazy="joined")
    student: Mapped[User] = relationship(lazy="joined", foreign_keys=[student_id])


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id", name="uq_answer_attempt_question"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("attempts.id", ondelete="CASCADE"))
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    answer_text: Mapped[str] = mapped_column(Text, default="")
    selected_option: Mapped[str | None] = mapped_column(String(500), nullable=True)
    marked_for_review: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    final_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_status: Mapped[str] = mapped_column(String(24), default="not_reviewed")
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    question: Mapped[Question] = relationship(lazy="joined")


class PYQPaper(Base):
    __tablename__ = "pyq_papers"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    year: Mapped[int] = mapped_column(Integer, index=True)
    exam_type: Mapped[str] = mapped_column(String(64), default="End-Term")
    university: Mapped[str] = mapped_column(String(160), default="University")
    description: Mapped[str] = mapped_column(Text, default="")
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    subject: Mapped[Subject] = relationship(lazy="joined")
    questions: Mapped[list["PYQQuestion"]] = relationship(back_populates="paper", cascade="all, delete-orphan")


class PYQQuestion(Base):
    __tablename__ = "pyq_questions"
    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int | None] = mapped_column(ForeignKey("pyq_papers.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    question_text: Mapped[str] = mapped_column(Text)
    marks: Mapped[float] = mapped_column(Float, default=5.0)
    question_type: Mapped[str] = mapped_column(String(32), default="short_answer")
    options: Mapped[list[str] | None] = mapped_column(JSON_DOCUMENT, nullable=True)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(24), default="medium")
    tags: Mapped[list[str]] = mapped_column(JSON_DOCUMENT, default=list)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    paper: Mapped[PYQPaper | None] = relationship(back_populates="questions")
    subject: Mapped[Subject] = relationship(lazy="joined")


class LabManual(Base):
    __tablename__ = "lab_manuals"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    lab_number: Mapped[int] = mapped_column(Integer, default=1)
    objectives: Mapped[str] = mapped_column(Text, default="")
    theory: Mapped[str] = mapped_column(Text, default="")
    procedure: Mapped[str] = mapped_column(Text, default="")
    sample_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    programming_language: Mapped[str] = mapped_column(String(40), default="python")
    expected_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    viva_questions: Mapped[list[dict]] = mapped_column(JSON_DOCUMENT, default=list)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    subject: Mapped[Subject] = relationship(lazy="joined")


class LabCompletion(Base):
    __tablename__ = "lab_completions"
    __table_args__ = (UniqueConstraint("student_id", "manual_id", name="uq_student_manual_completion"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    manual_id: Mapped[int] = mapped_column(ForeignKey("lab_manuals.id", ondelete="CASCADE"), index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[dict] = mapped_column(JSON_DOCUMENT, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(240))
    event_type: Mapped[str] = mapped_column(String(32), index=True)  # Quizathon, Hackathon, Ideathon, Buildathon, Innovathon
    description: Mapped[str] = mapped_column(Text)
    rules: Mapped[str] = mapped_column(Text, default="")
    prizes: Mapped[str] = mapped_column(Text, default="")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration: Mapped[str] = mapped_column(String(64), default="24 Hours")
    registration_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_participants: Mapped[int] = mapped_column(Integer, default=500)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    registrations: Mapped[list["EventRegistration"]] = relationship(back_populates="event", cascade="all, delete-orphan")


class EventRegistration(Base):
    __tablename__ = "event_registrations"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_event_user_reg"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="registered")
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    event: Mapped[Event] = relationship(back_populates="registrations")
    user: Mapped[User] = relationship(lazy="joined")


class Course(Base):
    __tablename__ = "courses"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(240))
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    duration_hours: Mapped[int] = mapped_column(Integer, default=10)
    level: Mapped[str] = mapped_column(String(24), default="Beginner")  # Beginner, Intermediate, Advanced
    skills_covered: Mapped[list[str]] = mapped_column(JSON_DOCUMENT, default=list)
    syllabus: Mapped[list[dict]] = mapped_column(JSON_DOCUMENT, default=list)
    certificate_preview: Mapped[str] = mapped_column(Text, default="")
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    enrollments: Mapped[list["CourseEnrollment"]] = relationship(back_populates="course", cascade="all, delete-orphan")


class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"
    __table_args__ = (UniqueConstraint("course_id", "user_id", name="uq_course_user_enroll"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    progress_percentage: Mapped[int] = mapped_column(Integer, default=0)
    completed_modules: Mapped[list[str]] = mapped_column(JSON_DOCUMENT, default=list)
    status: Mapped[str] = mapped_column(String(24), default="enrolled")  # enrolled, in_progress, completed
    certificate_id: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    course: Mapped[Course] = relationship(back_populates="enrollments", lazy="joined")
    user: Mapped[User] = relationship(lazy="joined")


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    candidate_name: Mapped[str] = mapped_column(String(160), default="")
    target_role: Mapped[str] = mapped_column(String(160), default="")
    extracted_skills: Mapped[list[str]] = mapped_column(JSON_DOCUMENT, default=list)
    experience_summary: Mapped[str] = mapped_column(Text, default="")
    questions_generated: Mapped[list[dict]] = mapped_column(JSON_DOCUMENT, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
