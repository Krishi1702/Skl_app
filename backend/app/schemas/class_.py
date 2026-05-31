from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ClassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    is_active: bool
    section_count: int = 0
    created_at: datetime


class CreateClassIn(BaseModel):
    name: str


class UpdateClassIn(BaseModel):
    name: str


class UpdateStatusIn(BaseModel):
    is_active: bool
