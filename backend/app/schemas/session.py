from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.reading_session import AssessmentStatus, SessionStatus


class StartSessionIn(BaseModel):
    lesson_id: UUID
    language: str


class SessionStartedOut(BaseModel):
    session_id: UUID
    attempt_number: int
    started_at: datetime


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    student_id: UUID
    lesson_id: UUID
    lesson_title: str = ""
    attempt_number: int
    status: SessionStatus
    language: str
    assessment_status: AssessmentStatus
    duration_seconds: int | None
    started_at: datetime
    completed_at: datetime | None


class SubmitSessionOut(BaseModel):
    session_id: UUID
    assessment_status: str
    message: str


class AbandonSessionOut(BaseModel):
    session_id: UUID
    status: str
