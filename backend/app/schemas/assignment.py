from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TeacherAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    teacher_id: UUID
    teacher_name: str = ""
    teacher_email: str = ""
    section_id: UUID
    section_name: str = ""
    class_name: str = ""
    is_active: bool
    assigned_at: datetime
    unassigned_at: datetime | None = None


class CreateTeacherAssignmentIn(BaseModel):
    teacher_id: UUID
    section_id: UUID


class StudentAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    student_id: UUID
    student_name: str = ""
    student_email: str = ""
    section_id: UUID
    section_name: str = ""
    class_name: str = ""
    is_active: bool
    assigned_at: datetime
    unassigned_at: datetime | None = None


class CreateStudentAssignmentIn(BaseModel):
    student_id: UUID
    section_id: UUID


class MoveStudentIn(BaseModel):
    new_section_id: UUID
