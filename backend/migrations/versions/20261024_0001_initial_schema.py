"""Create the initial PRAVAAH domain schema.

Revision ID: 20261024_0001
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "20261024_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("users", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("email", sa.String(320), nullable=False), sa.Column("full_name", sa.String(160), nullable=False), sa.Column("password_hash", sa.String(255)), sa.Column("role", sa.String(40), nullable=False, server_default="applicant"), sa.Column("region_code", sa.String(40)), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_region_code", "users", ["region_code"])
    op.create_table("institutions", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(240), nullable=False), sa.Column("institution_code", sa.String(80), unique=True), sa.Column("region_code", sa.String(40), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_institutions_name", "institutions", ["name"])
    op.create_index("ix_institutions_region_code", "institutions", ["region_code"])
    op.create_table("policies", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("policy_key", sa.String(100), nullable=False), sa.Column("version", sa.Integer(), nullable=False, server_default="1"), sa.Column("title", sa.String(240), nullable=False), sa.Column("description", sa.Text()), sa.Column("source_reference", sa.String(500)), sa.Column("effective_from", sa.DateTime(timezone=True)), sa.Column("effective_until", sa.DateTime(timezone=True)), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_policies_policy_key", "policies", ["policy_key"])
    op.create_table("applications", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("reference_code", sa.String(64), nullable=False), sa.Column("institution_id", sa.Integer(), sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False), sa.Column("submitted_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("workflow_stage", sa.String(60), nullable=False, server_default="draft"), sa.Column("status", sa.String(40), nullable=False, server_default="draft"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()), sa.UniqueConstraint("reference_code"))
    op.create_index("ix_applications_reference_code", "applications", ["reference_code"], unique=True)
    op.create_index("ix_applications_institution_id", "applications", ["institution_id"])
    op.create_index("ix_applications_workflow_stage", "applications", ["workflow_stage"])
    op.create_index("ix_applications_status", "applications", ["status"])
    op.create_table("evidence", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False), sa.Column("policy_id", sa.Integer(), sa.ForeignKey("policies.id", ondelete="SET NULL")), sa.Column("original_filename", sa.String(255), nullable=False), sa.Column("storage_key", sa.String(500), nullable=False, unique=True), sa.Column("content_type", sa.String(120)), sa.Column("sha256_digest", sa.String(64)), sa.Column("review_status", sa.String(40), nullable=False, server_default="pending"), sa.Column("reviewer_notes", sa.Text()), sa.Column("valid_until", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_evidence_application_id", "evidence", ["application_id"])
    op.create_table("obligations", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE")), sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("obligation_type", sa.String(60), nullable=False), sa.Column("title", sa.String(240), nullable=False), sa.Column("description", sa.Text()), sa.Column("due_at", sa.DateTime(timezone=True)), sa.Column("status", sa.String(40), nullable=False, server_default="open"), sa.Column("policy_reference", sa.String(240)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_obligations_application_id", "obligations", ["application_id"])
    op.create_index("ix_obligations_owner_user_id", "obligations", ["owner_user_id"])
    op.create_index("ix_obligations_obligation_type", "obligations", ["obligation_type"])
    op.create_index("ix_obligations_due_at", "obligations", ["due_at"])
    op.create_index("ix_obligations_status", "obligations", ["status"])
    op.create_table("notifications", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("recipient_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("event_key", sa.String(160), nullable=False, unique=True), sa.Column("channel", sa.String(40), nullable=False, server_default="in_app"), sa.Column("status", sa.String(40), nullable=False, server_default="pending"), sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"), sa.Column("payload_json", sa.Text(), nullable=False), sa.Column("last_error", sa.Text()), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_notifications_recipient_user_id", "notifications", ["recipient_user_id"])
    op.create_index("ix_notifications_status", "notifications", ["status"])
    op.create_table("audit_events", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("entity_type", sa.String(80), nullable=False), sa.Column("entity_id", sa.String(100), nullable=False), sa.Column("action", sa.String(100), nullable=False), sa.Column("reason", sa.Text()), sa.Column("details_json", sa.Text(), nullable=False, server_default="{}"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_audit_events_entity_type", "audit_events", ["entity_type"])
    op.create_index("ix_audit_events_entity_id", "audit_events", ["entity_id"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])


def downgrade() -> None:
    for table in ["audit_events", "notifications", "obligations", "evidence", "applications", "policies", "institutions", "users"]:
        op.drop_table(table)
