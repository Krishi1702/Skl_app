from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.lesson import Language, PdfExtractionStatus


class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    section_id: UUID
    uploaded_by: UUID
    uploaded_by_name: str = ""
    title: str
    description: str | None
    language: Language
    pdf_extraction_status: PdfExtractionStatus
    display_order: int
    is_published: bool
    created_at: datetime
    updated_at: datetime


class LessonWithStatsOut(LessonOut):
    attempt_count: int = 0
    avg_score: float | None = None


class LessonWithProgressOut(LessonOut):
    my_best_score: float | None = None
    my_attempt_count: int = 0
    completion_status: str = "not_started"


class UpdateLessonIn(BaseModel):
    title: str | None = None
    description: str | None = None
    language: Language | None = None
    is_published: bool | None = None


class ReorderLessonsIn(BaseModel):
    order: list[UUID]


class PdfUrlOut(BaseModel):
    url: str
    expires_at: datetime
