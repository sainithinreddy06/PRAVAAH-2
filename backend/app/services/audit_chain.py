"""Audit hash-chain verification utilities."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_event import AuditChainState, AuditEvent, calculate_audit_hash

ZERO_HASH = "0" * 64


def verify_audit_chain(db: Session) -> dict[str, int | bool | None]:
    events = list(db.scalars(select(AuditEvent).order_by(AuditEvent.id.asc())).all())
    expected_previous = ZERO_HASH
    first_invalid_event_id: int | None = None

    for item in events:
        calculated = calculate_audit_hash(
            event_id=item.id,
            actor_user_id=item.actor_user_id,
            entity_type=item.entity_type,
            entity_id=item.entity_id,
            action=item.action,
            reason=item.reason,
            details_json=item.details_json or "{}",
            created_at=item.created_at,
            previous_hash=expected_previous,
        )
        if item.previous_hash != expected_previous or item.event_hash != calculated:
            first_invalid_event_id = item.id
            break
        expected_previous = item.event_hash

    state = db.get(AuditChainState, 1)
    stored_head = state.head_hash if state is not None else ZERO_HASH
    head_matches = first_invalid_event_id is None and stored_head == expected_previous
    return {
        "verified": first_invalid_event_id is None and head_matches,
        "event_count": len(events),
        "first_invalid_event_id": first_invalid_event_id,
        "head_matches": head_matches,
    }
