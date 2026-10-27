from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int | None] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), index=True, nullable=True)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    obligation_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), default="open", nullable=False, index=True)
    policy_reference: Mapped[str | None] = mapped_column(String(240), nullable=True)
    policy_id: Mapped[int | None] = mapped_column(ForeignKey("policies.id", ondelete="SET NULL"), index=True, nullable=True)
    policy_key_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True)
    policy_version_snapshot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deadline_rule: Mapped[str] = mapped_column(String(60), nullable=False, default="manual")
    deadline_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deadline_calculation_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_at_calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
