from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, SmallInteger, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WeeklyLeaderboard(Base):
    __tablename__ = "weekly_leaderboard"
    __table_args__ = (
        UniqueConstraint("section_id", "student_id", "week_start", name="uq_leaderboard_entry"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    week_end: Mapped[date] = mapped_column(Date, nullable=False)

    sessions_completed: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    avg_overall_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    avg_accuracy_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    avg_fluency_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    composite_score: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    rank: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    section: Mapped[Section] = relationship("Section", back_populates="weekly_leaderboard_entries")
    student: Mapped[User] = relationship("User", back_populates="weekly_leaderboard_entries")
