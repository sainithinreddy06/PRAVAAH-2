"""Add immutable EVC visit report revisions.

Revision ID: 20261028_0007
Revises: 20261028_0006
"""
from alembic import op
import sqlalchemy as sa

revision = "20261028_0007"
down_revision = "20261028_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "evc_visit_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("visit_id", sa.Integer(), sa.ForeignKey("evc_visits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("findings", sa.Text(), nullable=False),
        sa.Column("results_json", sa.Text(), nullable=False),
        sa.Column("change_reason", sa.Text(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("visit_id", "revision", name="uq_evc_visit_report_revision"),
    )
    op.create_index("ix_evc_visit_reports_visit_id", "evc_visit_reports", ["visit_id"])


def downgrade() -> None:
    op.drop_table("evc_visit_reports")
