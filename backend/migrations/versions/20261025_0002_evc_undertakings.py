"""Add EVC assessment and undertaking records.

Revision ID: 20261025_0002
Revises: 20261024_0001
"""
from alembic import op
import sqlalchemy as sa

revision = "20261025_0002"
down_revision = "20261024_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "undertakings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("undertaking_type", sa.String(80), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
        sa.Column("reviewed_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("reviewer_notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_undertakings_application_id", "undertakings", ["application_id"])
    op.create_index("ix_undertakings_undertaking_type", "undertakings", ["undertaking_type"])
    op.create_index("ix_undertakings_status", "undertakings", ["status"])

    op.create_table(
        "evc_assessments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assessed_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("evidence_total", sa.Integer(), nullable=False),
        sa.Column("evidence_accepted", sa.Integer(), nullable=False),
        sa.Column("evidence_pending", sa.Integer(), nullable=False),
        sa.Column("evidence_rejected", sa.Integer(), nullable=False),
        sa.Column("open_obligations", sa.Integer(), nullable=False),
        sa.Column("undertaking_count", sa.Integer(), nullable=False),
        sa.Column("outcome", sa.String(60), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_evc_assessments_application_id", "evc_assessments", ["application_id"])


def downgrade() -> None:
    op.drop_table("evc_assessments")
    op.drop_table("undertakings")
