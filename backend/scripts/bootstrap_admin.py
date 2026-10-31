"""One-time, environment-gated bootstrap for the PRAVAAH platform administrator.

Set PRAVAAH_BOOTSTRAP_ADMIN_ONCE=true and
PRAVAAH_BOOTSTRAP_ADMIN_PASSWORD to provision/reset the fixed demo admin during
deployment. Remove both variables immediately after the bootstrap deploy succeeds.
"""
import os
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
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

    print("Platform administrator bootstrap completed for configured demo account.")


if __name__ == "__main__":
    main()
