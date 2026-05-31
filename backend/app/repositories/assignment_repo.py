from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import StudentSectionAssignment, TeacherSectionAssignment
from app.repositories.base import BaseRepository


class TeacherAssignmentRepository(BaseRepository[TeacherSectionAssignment]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(TeacherSectionAssignment, db)

    async def get_active(self, teacher_id: UUID, section_id: UUID) -> TeacherSectionAssignment | None:
        result = await self.db.execute(
            select(TeacherSectionAssignment).where(
                TeacherSectionAssignment.teacher_id == teacher_id,
                TeacherSectionAssignment.section_id == section_id,
                TeacherSectionAssignment.is_active == True,
            )
        )
        return result.scalar_one_or_none()

    async def get_sections_for_teacher(self, teacher_id: UUID) -> list[UUID]:
        result = await self.db.execute(
            select(TeacherSectionAssignment.section_id).where(
                TeacherSectionAssignment.teacher_id == teacher_id,
                TeacherSectionAssignment.is_active == True,
            )
        )
        return [row[0] for row in result.all()]


class StudentAssignmentRepository(BaseRepository[StudentSectionAssignment]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(StudentSectionAssignment, db)

    async def get_active_for_student(self, student_id: UUID) -> StudentSectionAssignment | None:
        result = await self.db.execute(
            select(StudentSectionAssignment).where(
                StudentSectionAssignment.student_id == student_id,
                StudentSectionAssignment.is_active == True,
            )
        )
        return result.scalar_one_or_none()

    async def get_students_in_section(self, section_id: UUID) -> list[UUID]:
        result = await self.db.execute(
            select(StudentSectionAssignment.student_id).where(
                StudentSectionAssignment.section_id == section_id,
                StudentSectionAssignment.is_active == True,
            )
        )
        return [row[0] for row in result.all()]
