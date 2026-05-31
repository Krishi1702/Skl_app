from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.dependencies import DbSession, TeacherUser
from app.models.assignment import TeacherSectionAssignment, StudentSectionAssignment
from app.models.lesson import Lesson
from app.models.section import Section

router = APIRouter()


@router.get("")
async def get_my_sections(db: DbSession, teacher: TeacherUser):
    # Get sections the teacher is actively assigned to, with class_name
    stmt = (
        select(Section)
        .join(TeacherSectionAssignment, TeacherSectionAssignment.section_id == Section.id)
        .where(
            TeacherSectionAssignment.teacher_id == teacher.id,
            TeacherSectionAssignment.is_active == True,
            Section.is_active == True,
        )
        .options(selectinload(Section.school_class))
    )
    sections = list((await db.execute(stmt)).scalars().all())

    if not sections:
        return {"data": []}

    section_ids = [s.id for s in sections]

    # Count active students per section
    student_counts = dict(
        (await db.execute(
            select(StudentSectionAssignment.section_id, func.count())
            .where(
                StudentSectionAssignment.section_id.in_(section_ids),
                StudentSectionAssignment.is_active == True,
            )
            .group_by(StudentSectionAssignment.section_id)
        )).all()
    )

    # Count active teachers per section
    teacher_counts = dict(
        (await db.execute(
            select(TeacherSectionAssignment.section_id, func.count())
            .where(
                TeacherSectionAssignment.section_id.in_(section_ids),
                TeacherSectionAssignment.is_active == True,
            )
            .group_by(TeacherSectionAssignment.section_id)
        )).all()
    )

    # Count lessons per section
    lesson_counts = dict(
        (await db.execute(
            select(Lesson.section_id, func.count())
            .where(Lesson.section_id.in_(section_ids))
            .group_by(Lesson.section_id)
        )).all()
    )

    data = [
        {
            "id": s.id,
            "class_id": s.class_id,
            "class_name": s.school_class.name if s.school_class else "",
            "name": s.name,
            "is_active": s.is_active,
            "student_count": student_counts.get(s.id, 0),
            "teacher_count": teacher_counts.get(s.id, 0),
            "lesson_count": lesson_counts.get(s.id, 0),
            "created_at": s.created_at,
        }
        for s in sections
    ]
    return {"data": data}
