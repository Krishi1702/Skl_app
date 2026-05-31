from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StudentSkillProfile(Base):
    __tablename__ = "student_skill_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    avg_accuracy_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    avg_fluency_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    avg_pronunciation_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    avg_overall_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)

    total_sessions_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_lessons_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    strength_tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    weakness_tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)

    last_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    student: Mapped[User] = relationship("User", back_populates="skill_profile")
