from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import func, select

from app.core.dependencies import AdminUser, DbSession
from app.models.lesson import Lesson
from app.models.reading_session import ReadingSession, SessionStatus
from app.models.user import User, UserRole

router = APIRouter()


@router.get("")
async def admin_dashboard(db: DbSession, _: AdminUser):
    from app.models.class_ import SchoolClass
    from app.models.section import Section
    from app.models.assignment import TeacherSectionAssignment, StudentSectionAssignment

    total_classes = (await db.execute(select(func.count()).select_from(SchoolClass))).scalar_one()
    total_sections = (await db.execute(select(func.count()).select_from(Section))).scalar_one()
    total_teachers = (await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.teacher))).scalar_one()
    total_students = (await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.student))).scalar_one()

    assigned_teacher_ids = (await db.execute(select(TeacherSectionAssignment.teacher_id).where(TeacherSectionAssignment.is_active == True))).scalars().all()
    assigned_student_ids = (await db.execute(select(StudentSectionAssignment.student_id).where(StudentSectionAssignment.is_active == True))).scalars().all()

    from datetime import datetime, timedelta, timezone
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    lessons_uploaded = (await db.execute(select(func.count()).select_from(Lesson).where(Lesson.created_at >= week_ago))).scalar_one()
    sessions_completed = (await db.execute(select(func.count()).select_from(ReadingSession).where(ReadingSession.completed_at >= week_ago, ReadingSession.status == SessionStatus.completed))).scalar_one()

    return {
        "summary": {
            "total_classes": total_classes,
            "total_sections": total_sections,
            "total_teachers": total_teachers,
            "total_students": total_students,
            "unassigned_teachers": total_teachers - len(set(assigned_teacher_ids)),
            "unassigned_students": total_students - len(set(assigned_student_ids)),
        },
        "weekly_activity": {
            "lessons_uploaded": lessons_uploaded,
            "reading_sessions_completed": sessions_completed,
            "active_students": 0,
        },
        "unassigned_users": [],
    }
