"""One-time, environment-gated bootstrap for the PRAVAAH platform administrator.

Set PRAVAAH_BOOTSTRAP_ADMIN_ONCE=true and
PRAVAAH_BOOTSTRAP_ADMIN_PASSWORD to provision/reset the fixed demo admin during
deployment. Remove both variables immediately after the bootstrap deploy succeeds.
"""
import json
import os
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.audit_event import AuditEvent
from app.models.user import User

EMAIL = "platform-admin.demo@pravaah.local"


def main() -> None:
    if os.getenv("PRAVAAH_BOOTSTRAP_ADMIN_ONCE", "").casefold() != "true":
        print("Admin bootstrap disabled.")
        return
    password = os.getenv("PRAVAAH_BOOTSTRAP_ADMIN_PASSWORD", "")
    if not password:
        print("Admin bootstrap requested but password is missing.", file=sys.stderr)
        raise SystemExit(1)

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == EMAIL))
        if user is None:
            user = User(email=EMAIL, full_name="PRAVAAH Platform Administrator")
            db.add(user)
        user.full_name = "PRAVAAH Platform Administrator"
        user.password_hash = hash_password(password)
        user.role = "platform_admin"
        user.region_code = None
        user.is_active = True
        db.commit()
        db.refresh(user)

        # Add visibly synthetic records only when the audit ledger is empty.
        # Existing real audit history is never overwritten or mixed with samples.
        if db.scalar(select(AuditEvent.id).limit(1)) is None:
            samples = [
                ("application", "DEMO-APP-0148", "application.submitted", "Demo application submitted", {"demo": True, "status": "submitted"}),
                ("evidence", "DEMO-EVD-0201", "evidence.uploaded", "Demo evidence upload recorded", {"demo": True, "document_type": "institution_registration"}),
                ("application", "DEMO-APP-0148", "scrutiny.observation_recorded", "Demo scrutiny observation recorded", {"demo": True, "observation": "Sample completeness check"}),
                ("obligation", "DEMO-OBL-0034", "obligation.reminder_issued", "Demo compliance reminder issued", {"demo": True, "status": "reminder_issued"}),
                ("policy", "DEMO-POL-LSE-014", "policy.version_pinned", "Demo policy version pinned", {"demo": True, "policy_key": "DEMO-LSE", "version": 1}),
            ]
            for entity_type, entity_id, action, reason, details in samples:
                db.add(
                    AuditEvent(
                        actor_user_id=user.id,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        action=action,
                        reason=reason,
                        details_json=json.dumps(details, sort_keys=True),
                    )
                )
            db.commit()
            print("Inserted 5 clearly labeled demo audit events into an empty audit ledger.")

    print("Platform administrator bootstrap completed for configured demo account.")


if __name__ == "__main__":
    main()
