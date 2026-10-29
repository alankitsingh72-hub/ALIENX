"""Add subjects, pyqs, and lab manuals schema.

Revision ID: 0002_subjects_pyqs_labs
Revises: 0001_initial
Create Date: 2026-10-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_subjects_pyqs_labs"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    json_document = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")

    # 1. Subjects table
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("name", name="uq_subjects_name"),
        sa.UniqueConstraint("code", name="uq_subjects_code"),
    )
    op.create_index("ix_subjects_name", "subjects", ["name"])
    op.create_index("ix_subjects_code", "subjects", ["code"])

    # 2. Add subject_id to questions & examinations
    with op.batch_alter_table("questions") as batch_op:
        batch_op.add_column(sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id", name="fk_questions_subject_id"), nullable=True))
        batch_op.create_index("ix_questions_subject_id", ["subject_id"])

    with op.batch_alter_table("examinations") as batch_op:
        batch_op.add_column(sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id", name="fk_examinations_subject_id"), nullable=True))
        batch_op.create_index("ix_examinations_subject_id", ["subject_id"])

    # 3. PYQ Papers
    op.create_table(
        "pyq_papers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("exam_type", sa.String(64), nullable=False, server_default="End-Term"),
        sa.Column("university", sa.String(160), nullable=False, server_default="University"),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("file_url", sa.String(500), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_pyq_papers_subject_id", "pyq_papers", ["subject_id"])
    op.create_index("ix_pyq_papers_year", "pyq_papers", ["year"])
    op.create_index("ix_pyq_papers_created_by", "pyq_papers", ["created_by"])

    # 4. PYQ Questions
    op.create_table(
        "pyq_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("pyq_papers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("marks", sa.Float(), nullable=False, server_default="5.0"),
        sa.Column("question_type", sa.String(32), nullable=False, server_default="short_answer"),
        sa.Column("options", json_document, nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=True),
        sa.Column("solution", sa.Text(), nullable=True),
        sa.Column("difficulty", sa.String(24), nullable=False, server_default="medium"),
        sa.Column("tags", json_document, nullable=False, server_default="[]"),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_pyq_questions_paper_id", "pyq_questions", ["paper_id"])
    op.create_index("ix_pyq_questions_subject_id", "pyq_questions", ["subject_id"])
    op.create_index("ix_pyq_questions_year", "pyq_questions", ["year"])
    op.create_index("ix_pyq_questions_created_by", "pyq_questions", ["created_by"])

    # 5. Lab Manuals
    op.create_table(
        "lab_manuals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("lab_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("objectives", sa.Text(), nullable=False, server_default=""),
        sa.Column("theory", sa.Text(), nullable=False, server_default=""),
        sa.Column("procedure", sa.Text(), nullable=False, server_default=""),
        sa.Column("sample_code", sa.Text(), nullable=True),
        sa.Column("programming_language", sa.String(40), nullable=False, server_default="python"),
        sa.Column("expected_output", sa.Text(), nullable=True),
        sa.Column("viva_questions", json_document, nullable=False, server_default="[]"),
        sa.Column("file_url", sa.String(500), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_lab_manuals_subject_id", "lab_manuals", ["subject_id"])
    op.create_index("ix_lab_manuals_created_by", "lab_manuals", ["created_by"])

    # 6. Lab Completions
    op.create_table(
        "lab_completions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("manual_id", sa.Integer(), sa.ForeignKey("lab_manuals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "manual_id", name="uq_student_manual_completion"),
    )
    op.create_index("ix_lab_completions_student_id", "lab_completions", ["student_id"])
    op.create_index("ix_lab_completions_manual_id", "lab_completions", ["manual_id"])


def downgrade() -> None:
    op.drop_table("lab_completions")
    op.drop_table("lab_manuals")
    op.drop_table("pyq_questions")
    op.drop_table("pyq_papers")
    with op.batch_alter_table("examinations") as batch_op:
        batch_op.drop_index("ix_examinations_subject_id")
        batch_op.drop_column("subject_id")
    with op.batch_alter_table("questions") as batch_op:
        batch_op.drop_index("ix_questions_subject_id")
        batch_op.drop_column("subject_id")
    op.drop_table("subjects")
