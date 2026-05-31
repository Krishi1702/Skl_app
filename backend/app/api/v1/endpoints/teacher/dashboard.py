from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.core.dependencies import DbSession, TeacherUser
from app.models.assignment import StudentSectionAssignment, TeacherSectionAssignment
from app.models.reading_session import ReadingSession, SessionStatus
from app.models.user import User

router = APIRouter()


async def _verify_owns(teacher_id: UUID, section_id: UUID, db) -> None:
    r = await db.execute(
        select(TeacherSectionAssignment).where(
            TeacherSectionAssignment.teacher_id == teacher_id,
            TeacherSectionAssignment.section_id == section_id,
            TeacherSectionAssignment.is_active == True,
        )
    )
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Section not assigned to you")


@router.get("/{sectionId}/dashboard")
async def section_dashboard(sectionId: UUID, db: DbSession, teacher: TeacherUser):
    await _verify_owns(teacher.id, sectionId, db)

    student_count = (await db.execute(
        select(func.count()).select_from(StudentSectionAssignment).where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
        )
    )).scalar_one()

    avg_score = (await db.execute(
        select(func.avg(ReadingSession.id)).select_from(ReadingSession).where(
            ReadingSession.lesson_id.in_(
                select(ReadingSession.lesson_id)  # simplified; join assessment_results in prod
            )
        )
    )).scalar_one_or_none()

    return {
        "section": {"id": sectionId},
        "summary": {
            "total_students": student_count,
            "active_students_last_7_days": 0,
            "avg_overall_score": None,
            "total_sessions_this_week": 0,
            "lessons_published": 0,
        },
        "top_leaderboard": [],
    }


@router.get("/{sectionId}/students")
async def section_students(
    sectionId: UUID, db: DbSession, teacher: TeacherUser,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    await _verify_owns(teacher.id, sectionId, db)

    stmt = (
        select(User)
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == User.id)
        .where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
        )
    )
    if search:
        stmt = stmt.where(User.full_name.ilike(f"%{search}%"))

    students = list((await db.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all())
    return {"data": [{"student_id": s.id, "student_name": s.full_name, "lessons_completed": 0, "total_sessions": 0, "avg_overall_score": None, "current_streak": 0, "last_session_date": None} for s in students]}


@router.get("/{sectionId}/students/{studentId}/progress")
async def student_progress(sectionId: UUID, studentId: UUID, db: DbSession, teacher: TeacherUser, days: int = Query(30, ge=7, le=90)):
    await _verify_owns(teacher.id, sectionId, db)
    student = await db.get(User, studentId)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"student": {"id": studentId, "full_name": student.full_name, "email": student.email}, "skill_profile": {}, "skill_trend": [], "session_history": []}


@router.get("/{sectionId}/leaderboard")
async def section_leaderboard(sectionId: UUID, db: DbSession, teacher: TeacherUser):
    await _verify_owns(teacher.id, sectionId, db)
    return {"section_name": "", "week_start": None, "week_end": None, "entries": []}
