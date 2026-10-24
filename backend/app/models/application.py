from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference_code: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    submitted_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    workflow_stage: Mapped[str] = mapped_column(
        String(60), default="draft", nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(40), default="draft", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
