"""Tamper-evident audit events and append-only chain head."""

import hashlib
import json
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, event, func, select
from sqlalchemy.orm import Mapped, Session as OrmSession, mapped_column

from app.db.base_class import Base


def _utc_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat()


def audit_event_payload(
    *,
    event_id: int | None,
    actor_user_id: int | None,
    entity_type: str,
    entity_id: str,
    action: str,
    reason: str | None,
    details_json: str,
    created_at: datetime,
    previous_hash: str,
) -> str:
    return json.dumps(
        {
            "action": action,
            "actor_user_id": actor_user_id,
            "created_at": _utc_iso(created_at),
            "details_json": details_json,
            "entity_id": entity_id,
            "entity_type": entity_type,
            "event_id": event_id,
            "previous_hash": previous_hash,
            "reason": reason,
        },
        sort_keys=True,
        separators=(",", ":"),
    )


def calculate_audit_hash(**values: object) -> str:
    return hashlib.sha256(audit_event_payload(**values).encode("utf-8")).hexdigest()


class AuditChainState(Base):
    __tablename__ = "audit_chain_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    head_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="0" * 64)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    details_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    previous_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="0" * 64)
    event_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="")


@event.listens_for(OrmSession, "before_flush")
def _chain_new_audit_events(session: OrmSession, flush_context: object, instances: object) -> None:
    new_events = [item for item in session.new if isinstance(item, AuditEvent) and not item.event_hash]
    if not new_events:
        return

    with session.no_autoflush:
        state = session.execute(
            select(AuditChainState).where(AuditChainState.id == 1).with_for_update()
        ).scalar_one_or_none()
        if state is None:
            latest = session.execute(
                select(AuditEvent).where(AuditEvent.event_hash != "").order_by(AuditEvent.id.desc()).limit(1)
            ).scalar_one_or_none()
            state = AuditChainState(id=1, head_hash=latest.event_hash if latest else "0" * 64)
            session.add(state)

    previous_hash = state.head_hash
    for item in new_events:
        if item.created_at is None:
            item.created_at = datetime.now(UTC)
        item.previous_hash = previous_hash
        item.event_hash = calculate_audit_hash(
            event_id=item.id,
            actor_user_id=item.actor_user_id,
            entity_type=item.entity_type,
            entity_id=item.entity_id,
            action=item.action,
            reason=item.reason,
            details_json=item.details_json or "{}",
            created_at=item.created_at,
            previous_hash=previous_hash,
        )
        previous_hash = item.event_hash
    state.head_hash = previous_hash
