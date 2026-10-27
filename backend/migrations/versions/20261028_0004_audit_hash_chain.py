"""Backfill and enforce tamper-evident audit event hash chain.

Revision ID: 20261028_0004
Revises: 20261028_0003
"""
import hashlib
import json
from datetime import UTC, datetime

from alembic import op
import sqlalchemy as sa

revision = "20261028_0004"
down_revision = "20261028_0003"
branch_labels = None
depends_on = None

_ZERO_HASH = "0" * 64


def _utc_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat()


def _hash_event(row: object, previous_hash: str) -> str:
    payload = json.dumps(
        {
            "action": row["action"],
            "actor_user_id": row["actor_user_id"],
            "created_at": _utc_iso(row["created_at"]),
            "details_json": row["details_json"] or "{}",
            "entity_id": row["entity_id"],
            "entity_type": row["entity_type"],
            "previous_hash": previous_hash,
            "reason": row["reason"],
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def upgrade() -> None:
    op.add_column("audit_events", sa.Column("previous_hash", sa.String(64), nullable=True))
    op.add_column("audit_events", sa.Column("event_hash", sa.String(64), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT id, actor_user_id, entity_type, entity_id, action, reason, "
            "details_json, created_at FROM audit_events ORDER BY id ASC"
        )
    ).mappings().all()
    previous_hash = _ZERO_HASH
    for row in rows:
        event_hash = _hash_event(row, previous_hash)
        connection.execute(
            sa.text(
                "UPDATE audit_events SET previous_hash = :previous_hash, event_hash = :event_hash "
                "WHERE id = :id"
            ),
            {"previous_hash": previous_hash, "event_hash": event_hash, "id": row["id"]},
        )
        previous_hash = event_hash

    op.alter_column("audit_events", "previous_hash", nullable=False)
    op.alter_column("audit_events", "event_hash", nullable=False)
    op.create_table(
        "audit_chain_state",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("head_hash", sa.String(64), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("id = 1", name="ck_audit_chain_state_singleton"),
    )
    connection.execute(
        sa.text(
            "INSERT INTO audit_chain_state (id, head_hash) VALUES (1, :head_hash)"
        ),
        {"head_hash": previous_hash},
    )


def downgrade() -> None:
    op.drop_table("audit_chain_state")
    op.drop_column("audit_events", "event_hash")
    op.drop_column("audit_events", "previous_hash")
