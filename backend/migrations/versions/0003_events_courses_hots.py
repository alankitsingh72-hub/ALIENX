"""Add events, courses, and HOTS question support.

Revision ID: 0003_events_courses_hots
Revises: 0002_subjects_pyqs_labs
Create Date: 2026-10-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_events_courses_hots"
down_revision = "0002_subjects_pyqs_labs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    json_document = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")

    # 1. Add is_hots column to questions
    with op.batch_alter_table("questions") as batch_op:
        batch_op.add_column(sa.Column("is_hots", sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.create_index("ix_questions_is_hots", ["is_hots"])

    # 2. Events table
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("event_type", sa.String(32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("rules", sa.Text(), nullable=False, server_default=""),
        sa.Column("prizes", sa.Text(), nullable=False, server_default=""),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration", sa.String(64), nullable=False, server_default="24 Hours"),
        sa.Column("registration_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_participants", sa.Integer(), nullable=False, server_default="500"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", name="fk_events_created_by"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_events_event_type", "events", ["event_type"])
    op.create_index("ix_events_created_by", "events", ["created_by"])

    # 3. Event Registrations table
    op.create_table(
        "event_registrations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE", name="fk_event_reg_event"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_event_reg_user"), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="registered"),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("event_id", "user_id", name="uq_event_user_reg"),
    )
    op.create_index("ix_event_registrations_event_id", "event_registrations", ["event_id"])
    op.create_index("ix_event_registrations_user_id", "event_registrations", ["user_id"])

    # 4. Courses table
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("duration_hours", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("level", sa.String(24), nullable=False, server_default="Beginner"),
        sa.Column("skills_covered", json_document, nullable=False, server_default="[]"),
        sa.Column("syllabus", json_document, nullable=False, server_default="[]"),
        sa.Column("certificate_preview", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", name="fk_courses_created_by"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("code", name="uq_courses_code"),
    )
    op.create_index("ix_courses_code", "courses", ["code"])
    op.create_index("ix_courses_created_by", "courses", ["created_by"])

    # 5. Course Enrollments table
    op.create_table(
        "course_enrollments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("course_id", sa.Integer(), sa.ForeignKey("courses.id", ondelete="CASCADE", name="fk_course_enroll_course"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_course_enroll_user"), nullable=False),
        sa.Column("progress_percentage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_modules", json_document, nullable=False, server_default="[]"),
        sa.Column("status", sa.String(24), nullable=False, server_default="enrolled"),
        sa.Column("certificate_id", sa.String(64), nullable=True),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("course_id", "user_id", name="uq_course_user_enroll"),
        sa.UniqueConstraint("certificate_id", name="uq_course_certificate_id"),
    )
    op.create_index("ix_course_enrollments_course_id", "course_enrollments", ["course_id"])
    op.create_index("ix_course_enrollments_user_id", "course_enrollments", ["user_id"])

    # 6. Resume Analyses table
    op.create_table(
        "resume_analyses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", name="fk_resume_user"), nullable=False),
        sa.Column("candidate_name", sa.String(160), nullable=False, server_default=""),
        sa.Column("target_role", sa.String(160), nullable=False, server_default=""),
        sa.Column("extracted_skills", json_document, nullable=False, server_default="[]"),
        sa.Column("experience_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("questions_generated", json_document, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_resume_analyses_user_id", "resume_analyses", ["user_id"])


def downgrade() -> None:
    op.drop_table("resume_analyses")
    op.drop_table("course_enrollments")
    op.drop_table("courses")
    op.drop_table("event_registrations")
    op.drop_table("events")
    with op.batch_alter_table("questions") as batch_op:
        batch_op.drop_index("ix_questions_is_hots")
        batch_op.drop_column("is_hots")

