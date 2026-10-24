from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all persisted PRAVAAH entities."""


# Import models so Alembic and metadata.create_all can discover them.
from app.models import (  # noqa: E402,F401
    Application,
    AuditEvent,
    Evidence,
    Institution,
    Notification,
    Obligation,
    Policy,
    User,
)
