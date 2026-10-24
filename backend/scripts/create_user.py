"""Create a PRAVAAH user interactively for local or administrator-managed environments.

Run from the backend directory with: python -m scripts.create_user
No default credentials or public user-registration endpoint are created.
"""
from getpass import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User

_ALLOWED_ROLES = {"applicant", "institution_admin", "regional_officer", "platform_admin"}


def _read_required(prompt: str, *, max_length: int) -> str:
    while True:
        value = input(prompt).strip()
        if value and len(value) <= max_length:
            return value
        print(f"Enter a value between 1 and {max_length} characters.")


def main() -> None:
    email = _read_required("Email: ", max_length=320).casefold()
    full_name = _read_required("Full name: ", max_length=160)

    print("Roles: " + ", ".join(sorted(_ALLOWED_ROLES)))
    while True:
        role = input("Role: ").strip().casefold()
        if role in _ALLOWED_ROLES:
            break
        print("Choose one of the listed roles.")

    region_code = input("Region code (required except for platform_admin): ").strip().upper() or None
    if role != "platform_admin" and not region_code:
        print("A region code is required for non-admin users.")
        return
    if region_code and len(region_code) > 40:
        print("Region code must be 40 characters or fewer.")
        return
    if role == "platform_admin":
        region_code = None

    password = getpass("Password (minimum 12 characters): ")
    if len(password) < 12:
        print("Password must contain at least 12 characters.")
        return
    confirmation = getpass("Confirm password: ")
    if password != confirmation:
        print("Passwords did not match.")
        return

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == email))
        if existing is not None:
            print("A user with that email already exists. No changes were made.")
            return

        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            role=role,
            region_code=region_code,
            is_active=True,
        )
        db.add(user)
        db.commit()

    print(f"Created active {role} account for {email}.")
    print("Keep credentials private; this command does not print or store the password.")


if __name__ == "__main__":
    main()
