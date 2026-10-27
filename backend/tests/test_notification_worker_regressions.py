from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.application import Application
from app.models.audit_event import AuditEvent
from app.models.institution import Institution
from app.models.notification import Notification
from app.models.obligation import Obligation
from app.models.user import User
from app.services.notification_worker import _pending_notifications_statement, run_notification_cycle


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



def test_repeated_worker_cycles_do_not_duplicate_overdue_notifications_or_audit_events() -> None:
    engine, session_factory = _session_factory()
    now = datetime.now(UTC).replace(tzinfo=None)
    try:
        with session_factory() as db:
            db.add(User(
                id=903,
                email="overdue-owner@example.test",
                full_name="Overdue Owner",
                role="applicant",
                region_code="TS",
                is_active=True,
            ))
            db.commit()
            db.add(Institution(
                id=903,
                name="Worker Test Institution",
                institution_code="WORKER-TEST-903",
                region_code="TS",
            ))
            db.commit()
            db.add(Application(
                id=903,
                reference_code="WORKER-APP-903",
                institution_id=903,
                submitted_by_user_id=903,
                workflow_stage="draft",
                status="draft",
            ))
            db.commit()
            db.add(Obligation(
                id=903,
                application_id=903,
                owner_user_id=903,
                obligation_type="document_submission",
                title="One overdue obligation",
                due_at=now - timedelta(hours=1),
                status="open",
            ))
            db.commit()

        with session_factory() as db:
            first = run_notification_cycle(db, now=now)
        with session_factory() as db:
            second = run_notification_cycle(db, now=now + timedelta(minutes=1))

        assert first["overdue_notifications_queued"] == 1
        assert first["notifications_delivered"] == 1
        assert second["overdue_notifications_queued"] == 0

        with session_factory() as db:
            notifications = db.query(Notification).filter_by(
                event_key=f"obligation-overdue:903:{(now - timedelta(hours=1)).isoformat()}"
            ).all()
            audit_events = db.query(AuditEvent).filter_by(
                entity_type="obligation",
                entity_id="903",
                action="obligation.overdue_notified",
            ).all()
            assert len(notifications) == 1
            assert notifications[0].status == "delivered"
            assert len(audit_events) == 1
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()



def test_worker_query_uses_postgres_skip_locked_claiming() -> None:
    from sqlalchemy.dialects import postgresql

    statement = _pending_notifications_statement(datetime.now(UTC))
    sql = str(statement.compile(dialect=postgresql.dialect()))

    assert "FOR UPDATE SKIP LOCKED" in sql
    assert "LIMIT" in sql
    assert "notifications.status = " in sql
    assert "notifications.processed_at IS NULL" in sql
