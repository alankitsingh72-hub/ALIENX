"""Create ALIENX academic examination schema."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    role = sa.Enum("admin", "faculty", "student", name="userrole")
    question_type = sa.Enum("mcq", "short_answer", "descriptive", name="questiontype")
    json_document = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", role, nullable=False),
        sa.Column("full_name", sa.String(160), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("type", question_type, nullable=False),
        sa.Column("options", json_document, nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=True),
        sa.Column("model_answer", sa.Text(), nullable=True),
        sa.Column("keywords", json_document, nullable=False, server_default="[]"),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("marks", sa.Float(), nullable=False),
        sa.Column("difficulty", sa.String(24), nullable=False, server_default="medium"),
        sa.Column("tags", json_document, nullable=False, server_default="[]"),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_questions_created_by", "questions", ["created_by"])
    op.create_table(
        "examinations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("attempt_limit", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("negative_marking", sa.Float(), nullable=False, server_default="0"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_closed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("shuffle_questions", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("shuffle_options", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("duration_minutes > 0", name="ck_exam_duration_positive"),
        sa.CheckConstraint("attempt_limit > 0", name="ck_exam_attempt_limit_positive"),
        sa.CheckConstraint("end_time > start_time", name="ck_exam_time_order"),
    )
    op.create_index("ix_examinations_created_by", "examinations", ["created_by"])
    op.create_table(
        "examination_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("examination_id", sa.Integer(), sa.ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.UniqueConstraint("examination_id", "question_id", name="uq_exam_question"),
        sa.UniqueConstraint("examination_id", "position", name="uq_exam_position"),
    )
    op.create_table(
        "attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("examination_id", sa.Integer(), sa.ForeignKey("examinations.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(24), nullable=False, server_default="in_progress"),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("question_order", json_document, nullable=True),
        sa.Column("option_orders", json_document, nullable=False, server_default="{}"),
        sa.Index("ix_attempt_student_exam", "student_id", "examination_id"),
    )
    op.create_index(
        "uq_active_attempt_student_exam",
        "attempts",
        ["student_id", "examination_id"],
        unique=True,
        postgresql_where=sa.text("status = 'in_progress'"),
        sqlite_where=sa.text("status = 'in_progress'"),
    )
    op.create_table(
        "answers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("attempt_id", sa.Integer(), sa.ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("selected_option", sa.String(500), nullable=True),
        sa.Column("marked_for_review", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("auto_score", sa.Float(), nullable=True),
        sa.Column("final_score", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("review_status", sa.String(24), nullable=False, server_default="not_reviewed"),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.UniqueConstraint("attempt_id", "question_id", name="uq_answer_attempt_question"),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("details", json_document, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("answers")
    op.drop_index("uq_active_attempt_student_exam", table_name="attempts")
    op.drop_table("attempts")
    op.drop_table("examination_questions")
    op.drop_table("examinations")
    op.drop_table("questions")
    op.drop_table("users")
    sa.Enum(name="questiontype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
