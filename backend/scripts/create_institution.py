"""Create an institution record for local testing or operator-managed setup.

Run from the backend directory with: python -m scripts.create_institution
With Docker Compose, run: docker compose exec api python -m scripts.create_institution
"""
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.institution import Institution


def _read_required(prompt: str, *, max_length: int) -> str:
    while True:
        value = input(prompt).strip()
        if value and len(value) <= max_length:
            return value
        print(f"Enter a value between 1 and {max_length} characters.")


def main() -> None:
    name = _read_required("Institution name: ", max_length=240)
    code = input("Institution code (optional): ").strip() or None
    if code and len(code) > 80:
        print("Institution code must be 80 characters or fewer.")
        return
    region_code = _read_required("Region code: ", max_length=40).upper()

    with SessionLocal() as db:
        if code and db.scalar(select(Institution).where(Institution.institution_code == code)):
            print("An institution with that code already exists. No changes were made.")
            return
        institution = Institution(name=name, institution_code=code, region_code=region_code)
        db.add(institution)
        db.commit()
        db.refresh(institution)
        institution_id = institution.id

    print(f"Created institution #{institution_id}: {name} ({region_code}).")
    print("Use this ID when creating an application. Verify region access before testing with non-admin accounts.")


if __name__ == "__main__":
    main()
