"""Add durable notification scheduling and processing timestamps.

Revision ID: 20261028_0003
Revises: 20261025_0002
"""
from alembic import op
import sqlalchemy as sa

revision = "20261028_0003"
down_revision = "20261025_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("notifications", sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_notifications_next_attempt_at", "notifications", ["next_attempt_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_next_attempt_at", table_name="notifications")
    op.drop_column("notifications", "processed_at")
    op.drop_column("notifications", "next_attempt_at")
