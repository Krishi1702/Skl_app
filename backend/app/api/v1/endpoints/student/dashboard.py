from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.core.dependencies import DbSession, StudentUser
from app.models.assignment import StudentSectionAssignment

router = APIRouter()


async def _get_student_section(student_id: UUID, db) -> UUID:
    r = await db.execute(
        select(StudentSectionAssignment.section_id).where(
            StudentSectionAssignment.student_id == student_id,
            StudentSectionAssignment.is_active == True,
        )
    )
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=412, detail="You have not been assigned to a section yet.")
    return row


@router.get("/dashboard")
async def student_dashboard(db: DbSession, student: StudentUser):
    section_id = await _get_student_section(student.id, db)

    from app.models.streak import Streak
    streak = await db.get(Streak, student.id)
    streak_info = {"current_streak": 0, "longest_streak": 0, "last_session_date": None}
    if streak:
        streak_info = {
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak,
            "last_session_date": streak.last_session_date,
        }

    from app.models.skill_profile import StudentSkillProfile
    from sqlalchemy import select as sel
    profile_row = (await db.execute(sel(StudentSkillProfile).where(StudentSkillProfile.student_id == student.id))).scalar_one_or_none()
    skill_profile = {
        "avg_accuracy_score": float(profile_row.avg_accuracy_score) if profile_row else 0,
        "avg_fluency_score": float(profile_row.avg_fluency_score) if profile_row else 0,
        "avg_pronunciation_score": float(profile_row.avg_pronunciation_score) if profile_row else 0,
        "avg_overall_score": float(profile_row.avg_overall_score) if profile_row else 0,
        "strength_tags": profile_row.strength_tags if profile_row else [],
        "weakness_tags": profile_row.weakness_tags if profile_row else [],
    }

    return {
        "student": {"id": student.id, "full_name": student.full_name, "section_name": "", "class_name": ""},
        "streak": streak_info,
        "current_rank": None,
        "progress": {"overall_progress_percent": 0, "lessons_completed": 0, "total_lessons": 0, "total_sessions": 0},
        "skill_profile": skill_profile,
        "recent_sessions": [],
        "next_lesson": None,
    }


@router.get("/leaderboard")
async def student_leaderboard(db: DbSession, student: StudentUser):
    section_id = await _get_student_section(student.id, db)
    return {"section_name": "", "week_start": None, "week_end": None, "my_rank": None, "entries": []}


@router.get("/progress")
async def student_progress(db: DbSession, student: StudentUser, days: int = Query(30, ge=7, le=90)):
    await _get_student_section(student.id, db)
    return {"trend": [], "summary": {"best_overall_score": None, "most_improved_skill": None, "most_improved_delta": None}}
