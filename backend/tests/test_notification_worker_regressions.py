from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.notification import Notification
from app.models.user import User
from app.services.notification_worker import run_notification_cycle


def _session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine, sessionmaker(bind=engine, autoflush=False, autocommit=False)


def test_inactive_recipient_is_failed_without_retry() -> None:
    engine, session_factory = _session_factory()
    now = datetime.now(UTC).replace(tzinfo=None)
    try:
        with session_factory() as db:
            db.add(
                User(
                    id=901,
                    email="inactive-notification@example.test",
                    full_name="Inactive Recipient",
                    role="applicant",
                    region_code="TS",
                    is_active=False,
                )
            )
            db.add(
                Notification(
                    recipient_user_id=901,
                    event_key="test:inactive-recipient",
                    channel="in_app",
                    status="pending",
                    attempt_count=0,
                    payload_json="{}",
                    next_attempt_at=now,
                )
            )
            db.commit()

        with session_factory() as db:
            result = run_notification_cycle(db, now=now)

        assert result["notifications_failed"] == 1
        assert result["notifications_retried"] == 0
        assert result["notifications_delivered"] == 0

        with session_factory() as db:
            notification = db.query(Notification).filter_by(
                event_key="test:inactive-recipient"
            ).one()
            assert notification.status == "failed"
            assert notification.attempt_count == 1
            assert notification.processed_at is not None
            assert notification.next_attempt_at is None
            assert notification.last_error == "Notification recipient is missing or inactive"
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_transient_delivery_error_uses_bounded_retry_schedule() -> None:
    engine, session_factory = _session_factory()
    now = datetime.now(UTC).replace(tzinfo=None)
    try:
        with session_factory() as db:
            db.add(
                User(
                    id=902,
                    email="active-notification@example.test",
                    full_name="Active Recipient",
                    role="applicant",
                    region_code="TS",
                    is_active=True,
                )
            )
            db.add(
                Notification(
                    recipient_user_id=902,
                    event_key="test:unsupported-channel",
                    channel="unsupported-test-channel",
                    status="pending",
                    attempt_count=0,
                    payload_json="{}",
                    next_attempt_at=now,
                )
            )
            db.commit()

        with session_factory() as db:
            result = run_notification_cycle(db, now=now)

        assert result["notifications_retried"] == 1
        assert result["notifications_failed"] == 0

        with session_factory() as db:
            notification = db.query(Notification).filter_by(
                event_key="test:unsupported-channel"
            ).one()
            assert notification.status == "pending"
            assert notification.attempt_count == 1
            assert notification.processed_at is None
            assert notification.next_attempt_at == now + timedelta(seconds=30)
            assert notification.last_error == "RuntimeError: Unsupported notification channel: unsupported-test-channel"
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
