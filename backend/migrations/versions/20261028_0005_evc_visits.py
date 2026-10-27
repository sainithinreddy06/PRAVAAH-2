"""Add scheduled EVC visit lifecycle records.

Revision ID: 20261028_0005
Revises: 20261028_0004
"""
from alembic import op
import sqlalchemy as sa

revision = "20261028_0005"
down_revision = "20261028_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "evc_visits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="scheduled"),
        sa.Column("checklist_json", sa.Text(), nullable=False),
        sa.Column("results_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("findings", sa.Text()),
        sa.Column("report_revision", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_evc_visits_application_id", "evc_visits", ["application_id"])
    op.create_index("ix_evc_visits_assigned_to_user_id", "evc_visits", ["assigned_to_user_id"])
    op.create_index("ix_evc_visits_status", "evc_visits", ["status"])
    op.create_index("ix_evc_visits_scheduled_at", "evc_visits", ["scheduled_at"])


def downgrade() -> None:
    op.drop_table("evc_visits")
