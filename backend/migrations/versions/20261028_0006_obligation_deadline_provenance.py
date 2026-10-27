"""Add policy-pinned obligation deadline rule provenance.

Revision ID: 20261028_0006
Revises: 20261028_0005
"""
from alembic import op
import sqlalchemy as sa

revision = "20261028_0006"
down_revision = "20261028_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("obligations", sa.Column("policy_id", sa.Integer(), sa.ForeignKey("policies.id", ondelete="SET NULL"), nullable=True))
    op.add_column("obligations", sa.Column("policy_key_snapshot", sa.String(100), nullable=True))
    op.add_column("obligations", sa.Column("policy_version_snapshot", sa.Integer(), nullable=True))
    op.add_column("obligations", sa.Column("deadline_rule", sa.String(60), nullable=False, server_default="manual"))
    op.add_column("obligations", sa.Column("deadline_days", sa.Integer(), nullable=True))
    op.add_column("obligations", sa.Column("deadline_calculation_json", sa.Text(), nullable=True))
    op.add_column("obligations", sa.Column("due_at_calculated_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_obligations_policy_id", "obligations", ["policy_id"])


def downgrade() -> None:
    op.drop_index("ix_obligations_policy_id", table_name="obligations")
    op.drop_column("obligations", "due_at_calculated_at")
    op.drop_column("obligations", "deadline_calculation_json")
    op.drop_column("obligations", "deadline_days")
    op.drop_column("obligations", "deadline_rule")
    op.drop_column("obligations", "policy_version_snapshot")
    op.drop_column("obligations", "policy_key_snapshot")
    op.drop_column("obligations", "policy_id")
