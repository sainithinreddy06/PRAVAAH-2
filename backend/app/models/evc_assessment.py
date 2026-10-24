from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class EvcAssessment(Base):
    __tablename__ = 'evc_assessments'

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey('applications.id', ondelete='CASCADE'), index=True, nullable=False)
    assessed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    evidence_total: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_accepted: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_pending: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_rejected: Mapped[int] = mapped_column(Integer, nullable=False)
    open_obligations: Mapped[int] = mapped_column(Integer, nullable=False)
    undertaking_count: Mapped[int] = mapped_column(Integer, nullable=False)
    outcome: Mapped[str] = mapped_column(String(60), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
