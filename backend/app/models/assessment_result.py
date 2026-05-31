from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, SmallInteger, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String

from app.db.base import Base


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reading_sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    accuracy_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    fluency_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    pronunciation_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    overall_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)

    words_per_minute: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    pause_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    filler_word_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)

    # JSONB fields for structured AI output
    mispronounced_words: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    pronunciation_issues: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    grammatical_mistakes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    strength_tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    weakness_tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)

    summary_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    session: Mapped[ReadingSession] = relationship("ReadingSession", back_populates="assessment_result")
