"""Durable notification outbox processing and overdue-obligation scheduling."""

import json
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent
from app.models.notification import Notification
from app.models.obligation import Obligation
from app.models.user import User

logger = logging.getLogger(__name__)
MAX_ATTEMPTS = 5
BATCH_SIZE = 100


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def _queue_overdue_obligations(db: Session, now: datetime) -> int:
    obligations = db.scalars(
        select(Obligation).where(
            Obligation.status.in_(["open", "in_progress"]),
            Obligation.due_at.is_not(None),
            Obligation.owner_user_id.is_not(None),
        )
    ).all()
    created = 0
    for obligation in obligations:
        if obligation.due_at is None or _utc(obligation.due_at) >= now:
            continue
        event_key = f"obligation-overdue:{obligation.id}:{obligation.due_at.isoformat()}"
        notification = Notification(
            recipient_user_id=obligation.owner_user_id,
            event_key=event_key,
            channel="in_app",
            status="pending",
            attempt_count=0,
            payload_json=json.dumps(
                {
                    "type": "obligation_overdue",
                    "obligation_id": obligation.id,
                    "title": obligation.title,
                    "due_at": obligation.due_at.isoformat(),
                },
                sort_keys=True,
            ),
            next_attempt_at=now,
        )
        try:
            with db.begin_nested():
                db.add(notification)
                db.flush()
        except IntegrityError:
            # The unique event key makes repeated scans and multiple workers safe.
            continue
        db.add(
            AuditEvent(
                actor_user_id=None,
                entity_type="obligation",
                entity_id=str(obligation.id),
                action="obligation.overdue_notified",
                reason="System worker queued overdue obligation notification",
                details_json=json.dumps(
                    {"recipient_user_id": obligation.owner_user_id, "event_key": event_key},
                    sort_keys=True,
                ),
            )
        )
        created += 1
    return created


def _deliver_in_app(db: Session, notification: Notification) -> None:
    if notification.recipient_user_id is None:
        raise ValueError("Notification recipient no longer exists")
    recipient = db.get(User, notification.recipient_user_id)
    if recipient is None or not recipient.is_active:
        raise ValueError("Notification recipient is missing or inactive")
    # The durable notification row is the in-app inbox item. No external
    # network call is needed for this channel.
    return None


def run_notification_cycle(db: Session, *, now: datetime | None = None) -> dict[str, int]:
    """Queue overdue obligations and process a bounded batch of durable notifications."""
    current = _utc(now or datetime.now(UTC))
    queued = _queue_overdue_obligations(db, current)
    db.flush()

    notifications = db.scalars(
        select(Notification)
        .where(
            Notification.status == "pending",
            Notification.processed_at.is_(None),
            (Notification.next_attempt_at.is_(None) | (Notification.next_attempt_at <= current)),
        )
        .order_by(Notification.created_at.asc(), Notification.id.asc())
        .limit(BATCH_SIZE)
        .with_for_update(skip_locked=True)
    ).all()

    delivered = 0
    retried = 0
    failed = 0
    for notification in notifications:
        notification.attempt_count += 1
        try:
            if notification.channel != "in_app":
                raise RuntimeError(f"Unsupported notification channel: {notification.channel}")
            _deliver_in_app(db, notification)
            notification.status = "delivered"
            notification.last_error = None
            notification.processed_at = current
            notification.next_attempt_at = None
            delivered += 1
        except ValueError as exc:
            # Missing/inactive recipients are permanent failures, not retryable.
            notification.status = "failed"
            notification.last_error = str(exc)
            notification.processed_at = current
            notification.next_attempt_at = None
            failed += 1
        except Exception as exc:
            notification.last_error = f"{type(exc).__name__}: {exc}"[:2000]
            if notification.attempt_count >= MAX_ATTEMPTS:
                notification.status = "failed"
                notification.processed_at = current
                notification.next_attempt_at = None
                failed += 1
            else:
                delay_seconds = min(30 * (2 ** (notification.attempt_count - 1)), 3600)
                notification.status = "pending"
                notification.next_attempt_at = current + timedelta(seconds=delay_seconds)
                retried += 1
            logger.warning(
                "Notification delivery attempt failed",
                extra={"notification_id": notification.id, "attempt": notification.attempt_count},
            )

    db.commit()
    return {
        "overdue_notifications_queued": queued,
        "notifications_delivered": delivered,
        "notifications_retried": retried,
        "notifications_failed": failed,
    }
