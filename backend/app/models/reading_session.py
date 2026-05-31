from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, SmallInteger, Text, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SessionStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class AssessmentStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ReadingSession(Base):
    __tablename__ = "reading_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="sessionstatus"),
        default=SessionStatus.in_progress,
        nullable=False,
    )
    language: Mapped[str] = mapped_column(String(20), nullable=False)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    assessment_status: Mapped[AssessmentStatus] = mapped_column(
        Enum(AssessmentStatus, name="assessmentstatus"),
        default=AssessmentStatus.pending,
        nullable=False,
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    retry_count: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped[User] = relationship("User", back_populates="reading_sessions")
    lesson: Mapped[Lesson] = relationship("Lesson", back_populates="reading_sessions")
    assessment_result: Mapped[AssessmentResult | None] = relationship(
        "AssessmentResult", back_populates="session", uselist=False
    )
