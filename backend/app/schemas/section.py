from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    class_id: UUID
    class_name: str = ""
    name: str
    is_active: bool
    student_count: int = 0
    teacher_count: int = 0
    created_at: datetime


class CreateSectionIn(BaseModel):
    class_id: UUID
    name: str


class UpdateSectionIn(BaseModel):
    name: str


class UpdateStatusIn(BaseModel):
    is_active: bool
