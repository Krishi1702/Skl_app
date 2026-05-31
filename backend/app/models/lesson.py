from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Language(str, enum.Enum):
    english = "english"
    tamil = "tamil"


class PdfExtractionStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"


class Lesson(TimestampMixin, Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sections.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[Language] = mapped_column(Enum(Language, name="language"), nullable=False)
    pdf_storage_key: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    pdf_extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_extraction_status: Mapped[PdfExtractionStatus] = mapped_column(
        Enum(PdfExtractionStatus, name="pdfextractionstatus"),
        default=PdfExtractionStatus.pending,
        nullable=False,
    )
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    section: Mapped[Section] = relationship("Section", back_populates="lessons")
    uploaded_by_user: Mapped[User] = relationship("User", back_populates="uploaded_lessons")
    reading_sessions: Mapped[list[ReadingSession]] = relationship(
        "ReadingSession", back_populates="lesson"
    )
