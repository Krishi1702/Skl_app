from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

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

    # ── Streak ───────────────────────────────────────────────────────────────
    from app.models.streak import Streak
    streak_row = (await db.execute(
        select(Streak).where(Streak.student_id == student.id)
    )).scalar_one_or_none()
    streak_info = {"current_streak": 0, "longest_streak": 0, "last_session_date": None}
    if streak_row:
        streak_info = {
            "current_streak": streak_row.current_streak,
            "longest_streak": streak_row.longest_streak,
            "last_session_date": streak_row.last_session_date,
        }

    # ── Skill Profile ─────────────────────────────────────────────────────────
    from app.models.skill_profile import StudentSkillProfile
    profile_row = (await db.execute(
        select(StudentSkillProfile).where(StudentSkillProfile.student_id == student.id)
    )).scalar_one_or_none()
    skill_profile = {
        "avg_accuracy_score": float(profile_row.avg_accuracy_score) if profile_row else 0.0,
        "avg_fluency_score": float(profile_row.avg_fluency_score) if profile_row else 0.0,
        "avg_pronunciation_score": float(profile_row.avg_pronunciation_score) if profile_row else 0.0,
        "avg_overall_score": float(profile_row.avg_overall_score) if profile_row else 0.0,
        "strength_tags": profile_row.strength_tags if profile_row else [],
        "weakness_tags": profile_row.weakness_tags if profile_row else [],
    }

    # ── Lesson Progress ───────────────────────────────────────────────────────
    from app.models.lesson import Lesson
    from app.models.reading_session import AssessmentStatus, ReadingSession, SessionStatus
    from app.models.assessment_result import AssessmentResult

    total_lessons = (await db.execute(
        select(func.count()).select_from(Lesson).where(
            Lesson.section_id == section_id,
            Lesson.is_published == True,
        )
    )).scalar_one()

    # Count distinct lessons the student has at least one completed assessment for
    lessons_completed = (await db.execute(
        select(func.count(func.distinct(ReadingSession.lesson_id)))
        .join(AssessmentResult, AssessmentResult.session_id == ReadingSession.id)
        .where(
            ReadingSession.student_id == student.id,
            ReadingSession.status == SessionStatus.completed,
            ReadingSession.assessment_status == AssessmentStatus.completed,
        )
    )).scalar_one() or 0

    total_sessions = (await db.execute(
        select(func.count()).select_from(ReadingSession).where(
            ReadingSession.student_id == student.id,
            ReadingSession.status == SessionStatus.completed,
        )
    )).scalar_one() or 0

    overall_progress = int(lessons_completed / total_lessons * 100) if total_lessons > 0 else 0

    # ── Rank (by avg_overall_score across section) ────────────────────────────
    ranked_profiles = (await db.execute(
        select(StudentSkillProfile.student_id, StudentSkillProfile.avg_overall_score)
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == StudentSkillProfile.student_id)
        .where(
            StudentSectionAssignment.section_id == section_id,
            StudentSectionAssignment.is_active == True,
        )
        .order_by(StudentSkillProfile.avg_overall_score.desc())
    )).all()

    current_rank = None
    for i, (sid, _) in enumerate(ranked_profiles, 1):
        if sid == student.id:
            current_rank = i
            break

    # ── Recent Sessions (last 5 completed) ───────────────────────────────────
    recent_rows = (await db.execute(
        select(ReadingSession, AssessmentResult.overall_score, Lesson.title)
        .outerjoin(AssessmentResult, AssessmentResult.session_id == ReadingSession.id)
        .join(Lesson, Lesson.id == ReadingSession.lesson_id)
        .where(
            ReadingSession.student_id == student.id,
            ReadingSession.status == SessionStatus.completed,
        )
        .order_by(ReadingSession.completed_at.desc())
        .limit(5)
    )).all()

    recent_sessions = [
        {
            "session_id": str(row[0].id),
            "lesson_id": str(row[0].lesson_id),
            "lesson_title": row[2] or "",
            "overall_score": float(row[1]) if row[1] is not None else None,
            "attempt_number": row[0].attempt_number,
            "completed_at": row[0].completed_at.isoformat() if row[0].completed_at else None,
        }
        for row in recent_rows
        if row[0].completed_at is not None
    ]

    # ── Next Lesson (first not yet completed) ────────────────────────────────
    all_lessons = (await db.execute(
        select(Lesson).where(
            Lesson.section_id == section_id,
            Lesson.is_published == True,
        ).order_by(Lesson.display_order.asc(), Lesson.created_at.asc())
    )).scalars().all()

    next_lesson = None
    for lesson in all_lessons:
        best = (await db.execute(
            select(func.max(AssessmentResult.overall_score))
            .join(ReadingSession, ReadingSession.id == AssessmentResult.session_id)
            .where(
                ReadingSession.student_id == student.id,
                ReadingSession.lesson_id == lesson.id,
                ReadingSession.status == SessionStatus.completed,
            )
        )).scalar_one_or_none()
        if best is None:
            next_lesson = {
                "lesson_id": str(lesson.id),
                "title": lesson.title,
                "language": lesson.language.value if hasattr(lesson.language, "value") else lesson.language,
                "estimated_minutes": None,
                "my_best_score": None,
            }
            break

    # ── Section / Class names ─────────────────────────────────────────────────
    from app.models.section import Section
    from app.models.class_ import SchoolClass
    section = await db.get(Section, section_id)
    section_name = section.name if section else ""
    class_name = ""
    if section:
        cls = await db.get(SchoolClass, section.class_id)
        class_name = cls.name if cls else ""

    return {
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "section_name": section_name,
            "class_name": class_name,
        },
        "streak": streak_info,
        "current_rank": current_rank,
        "progress": {
            "overall_progress_percent": overall_progress,
            "lessons_completed": lessons_completed,
            "total_lessons": total_lessons,
            "total_sessions": total_sessions,
        },
        "skill_profile": skill_profile,
        "recent_sessions": recent_sessions,
        "next_lesson": next_lesson,
    }


@router.get("/leaderboard")
async def student_leaderboard(
    db: DbSession,
    student: StudentUser,
    week_start: str | None = Query(None),
):
    from app.models.assessment_result import AssessmentResult
    from app.models.reading_session import ReadingSession, SessionStatus
    from app.models.section import Section
    from app.models.skill_profile import StudentSkillProfile
    from app.models.user import User

    section_id = await _get_student_section(student.id, db)

    # Determine week bounds
    if week_start:
        ws = date.fromisoformat(week_start)
    else:
        today = date.today()
        ws = today - timedelta(days=today.weekday())  # Monday
    we = ws + timedelta(days=6)

    week_start_dt = datetime(ws.year, ws.month, ws.day, tzinfo=timezone.utc)
    week_end_dt = datetime(we.year, we.month, we.day, 23, 59, 59, tzinfo=timezone.utc)

    # All active students in section
    section_students = (await db.execute(
        select(User)
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == User.id)
        .where(
            StudentSectionAssignment.section_id == section_id,
            StudentSectionAssignment.is_active == True,
        )
    )).scalars().all()

    entries = []
    for u in section_students:
        # Weekly session stats
        weekly = (await db.execute(
            select(
                func.count(AssessmentResult.id),
                func.avg(AssessmentResult.overall_score),
                func.avg(AssessmentResult.accuracy_score),
                func.avg(AssessmentResult.fluency_score),
            )
            .join(ReadingSession, ReadingSession.id == AssessmentResult.session_id)
            .where(
                ReadingSession.student_id == u.id,
                ReadingSession.status == SessionStatus.completed,
                AssessmentResult.assessed_at >= week_start_dt,
                AssessmentResult.assessed_at <= week_end_dt,
            )
        )).one()

        sessions_count = weekly[0] or 0
        avg_overall = float(weekly[1]) if weekly[1] else 0.0
        avg_accuracy = float(weekly[2]) if weekly[2] else 0.0
        avg_fluency = float(weekly[3]) if weekly[3] else 0.0

        # Fall back to all-time profile when no sessions this week
        if sessions_count == 0:
            profile = (await db.execute(
                select(StudentSkillProfile).where(StudentSkillProfile.student_id == u.id)
            )).scalar_one_or_none()
            if not profile:
                # Student has never completed a session — still include with 0 scores
                entries.append({
                    "student_id": str(u.id),
                    "student_name": u.full_name,
                    "sessions_completed": 0,
                    "avg_overall_score": 0.0,
                    "avg_accuracy_score": 0.0,
                    "avg_fluency_score": 0.0,
                    "composite_score": 0.0,
                    "is_current_user": u.id == student.id,
                })
                continue
            avg_overall = float(profile.avg_overall_score)
            avg_accuracy = float(profile.avg_accuracy_score)
            avg_fluency = float(profile.avg_fluency_score)
            sessions_count = profile.total_sessions_completed

        composite = round(avg_overall * 0.7 + min(sessions_count * 3, 30), 2)

        entries.append({
            "student_id": str(u.id),
            "student_name": u.full_name,
            "sessions_completed": sessions_count,
            "avg_overall_score": round(avg_overall, 2),
            "avg_accuracy_score": round(avg_accuracy, 2),
            "avg_fluency_score": round(avg_fluency, 2),
            "composite_score": composite,
            "is_current_user": u.id == student.id,
        })

    # Sort descending by composite score and assign ranks
    entries.sort(key=lambda x: x["composite_score"], reverse=True)
    for i, e in enumerate(entries, 1):
        e["rank"] = i

    my_rank = next((e["rank"] for e in entries if e["is_current_user"]), None)

    section_row = await db.get(Section, section_id)

    return {
        "section_name": section_row.name if section_row else "",
        "week_start": ws.isoformat(),
        "week_end": we.isoformat(),
        "my_rank": my_rank,
        "entries": entries,
    }


@router.get("/progress")
async def student_progress(db: DbSession, student: StudentUser, days: int = Query(30, ge=7, le=90)):
    from app.models.assessment_result import AssessmentResult
    from app.models.reading_session import ReadingSession, SessionStatus

    await _get_student_section(student.id, db)

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (await db.execute(
        select(ReadingSession, AssessmentResult)
        .join(AssessmentResult, AssessmentResult.session_id == ReadingSession.id)
        .where(
            ReadingSession.student_id == student.id,
            ReadingSession.status == SessionStatus.completed,
            ReadingSession.completed_at >= cutoff,
        )
        .order_by(ReadingSession.completed_at.asc())
    )).all()

    trend = [
        {
            "date": row[0].completed_at.date().isoformat(),
            "accuracy_score": float(row[1].accuracy_score),
            "fluency_score": float(row[1].fluency_score),
            "pronunciation_score": float(row[1].pronunciation_score),
            "overall_score": float(row[1].overall_score),
        }
        for row in rows
        if row[0].completed_at is not None
    ]

    best_score = max((t["overall_score"] for t in trend), default=None)

    # Most improved: compare first-half sessions to second-half sessions.
    # Always return the skill with the highest delta (even if negative).
    most_improved_skill = None
    most_improved_delta = None
    if len(trend) >= 2:
        half = max(len(trend) // 2, 1)
        first_half = trend[:half]
        second_half = trend[half:]
        skill_deltas = {}
        for skill in ("accuracy_score", "fluency_score", "pronunciation_score"):
            avg_first = sum(t[skill] for t in first_half) / len(first_half)
            avg_second = sum(t[skill] for t in second_half) / len(second_half)
            skill_deltas[skill] = avg_second - avg_first
        best_skill = max(skill_deltas, key=lambda k: skill_deltas[k])
        most_improved_skill = best_skill.replace("_score", "")
        most_improved_delta = round(skill_deltas[best_skill], 2)

    return {
        "trend": trend,
        "summary": {
            "best_overall_score": best_score,
            "most_improved_skill": most_improved_skill,
            "most_improved_delta": most_improved_delta,
        },
    }


@router.get("/achievements")
async def student_achievements(db: DbSession, student: StudentUser):
    from app.models.assessment_result import AssessmentResult
    from app.models.reading_session import ReadingSession, SessionStatus
    from app.models.skill_profile import StudentSkillProfile
    from app.models.streak import Streak

    await _get_student_section(student.id, db)

    streak_row = (await db.execute(
        select(Streak).where(Streak.student_id == student.id)
    )).scalar_one_or_none()

    profile_row = (await db.execute(
        select(StudentSkillProfile).where(StudentSkillProfile.student_id == student.id)
    )).scalar_one_or_none()

    best_score_val = (await db.execute(
        select(func.max(AssessmentResult.overall_score))
        .join(ReadingSession, ReadingSession.id == AssessmentResult.session_id)
        .where(ReadingSession.student_id == student.id)
    )).scalar_one_or_none()

    longest_streak = streak_row.longest_streak if streak_row else 0
    total_sessions = profile_row.total_sessions_completed if profile_row else 0
    total_lessons = profile_row.total_lessons_completed if profile_row else 0
    avg_accuracy = float(profile_row.avg_accuracy_score) if profile_row else 0.0
    avg_fluency = float(profile_row.avg_fluency_score) if profile_row else 0.0
    avg_pronunciation = float(profile_row.avg_pronunciation_score) if profile_row else 0.0
    best = float(best_score_val) if best_score_val else 0.0

    ACHIEVEMENTS = [
        # ── Streak ──────────────────────────────────────────────────────────
        {"id": "streak_1",  "title": "First Spark",         "description": "Complete a lesson on your first day",   "category": "streak",   "icon": "flame",    "earned": longest_streak >= 1,  "progress": min(longest_streak, 1),  "target": 1},
        {"id": "streak_3",  "title": "On a Roll",            "description": "Maintain a 3-day reading streak",       "category": "streak",   "icon": "flame",    "earned": longest_streak >= 3,  "progress": min(longest_streak, 3),  "target": 3},
        {"id": "streak_7",  "title": "Week Warrior",         "description": "Maintain a 7-day reading streak",       "category": "streak",   "icon": "flame",    "earned": longest_streak >= 7,  "progress": min(longest_streak, 7),  "target": 7},
        {"id": "streak_14", "title": "Fortnight Champion",   "description": "Maintain a 14-day reading streak",      "category": "streak",   "icon": "flame",    "earned": longest_streak >= 14, "progress": min(longest_streak, 14), "target": 14},
        {"id": "streak_30", "title": "Monthly Master",       "description": "Maintain a 30-day reading streak",      "category": "streak",   "icon": "flame",    "earned": longest_streak >= 30, "progress": min(longest_streak, 30), "target": 30},
        # ── Sessions ────────────────────────────────────────────────────────
        {"id": "sessions_1",  "title": "Getting Started",    "description": "Complete your first reading session",   "category": "sessions", "icon": "play",     "earned": total_sessions >= 1,  "progress": min(total_sessions, 1),  "target": 1},
        {"id": "sessions_5",  "title": "Regular Reader",     "description": "Complete 5 reading sessions",           "category": "sessions", "icon": "book",     "earned": total_sessions >= 5,  "progress": min(total_sessions, 5),  "target": 5},
        {"id": "sessions_10", "title": "Dedicated Learner",  "description": "Complete 10 reading sessions",          "category": "sessions", "icon": "book",     "earned": total_sessions >= 10, "progress": min(total_sessions, 10), "target": 10},
        {"id": "sessions_25", "title": "Reading Enthusiast", "description": "Complete 25 reading sessions",          "category": "sessions", "icon": "book",     "earned": total_sessions >= 25, "progress": min(total_sessions, 25), "target": 25},
        {"id": "sessions_50", "title": "Reading Champion",   "description": "Complete 50 reading sessions",          "category": "sessions", "icon": "book",     "earned": total_sessions >= 50, "progress": min(total_sessions, 50), "target": 50},
        # ── Lessons ─────────────────────────────────────────────────────────
        {"id": "lessons_1",  "title": "Bookworm Begins",    "description": "Complete your first lesson",             "category": "lessons",  "icon": "book-open", "earned": total_lessons >= 1,  "progress": min(total_lessons, 1),  "target": 1},
        {"id": "lessons_3",  "title": "Reading Club",       "description": "Complete 3 different lessons",           "category": "lessons",  "icon": "book-open", "earned": total_lessons >= 3,  "progress": min(total_lessons, 3),  "target": 3},
        {"id": "lessons_5",  "title": "Literature Lover",   "description": "Complete 5 different lessons",           "category": "lessons",  "icon": "book-open", "earned": total_lessons >= 5,  "progress": min(total_lessons, 5),  "target": 5},
        {"id": "lessons_10", "title": "Scholar",            "description": "Complete 10 different lessons",          "category": "lessons",  "icon": "book-open", "earned": total_lessons >= 10, "progress": min(total_lessons, 10), "target": 10},
        # ── Score ───────────────────────────────────────────────────────────
        {"id": "score_first", "title": "First Score",       "description": "Receive your first assessment score",    "category": "score",    "icon": "star",     "earned": total_sessions >= 1,  "progress": min(total_sessions, 1), "target": 1},
        {"id": "score_70",    "title": "Rising Star",       "description": "Score 70% or higher in any session",     "category": "score",    "icon": "star",     "earned": best >= 70, "progress": round(min(best, 70.0), 1), "target": 70},
        {"id": "score_80",    "title": "High Achiever",     "description": "Score 80% or higher in any session",     "category": "score",    "icon": "star",     "earned": best >= 80, "progress": round(min(best, 80.0), 1), "target": 80},
        {"id": "score_90",    "title": "Gold Standard",     "description": "Score 90% or higher in any session",     "category": "score",    "icon": "star",     "earned": best >= 90, "progress": round(min(best, 90.0), 1), "target": 90},
        {"id": "score_95",    "title": "Perfect Reader",    "description": "Score 95% or higher in any session",     "category": "score",    "icon": "trophy",   "earned": best >= 95, "progress": round(min(best, 95.0), 1), "target": 95},
        # ── Skills ──────────────────────────────────────────────────────────
        {"id": "accuracy_80",     "title": "Sharp Eye",      "description": "Average accuracy score above 80%",      "category": "skill",    "icon": "target",   "earned": avg_accuracy >= 80,     "progress": round(min(avg_accuracy, 80.0), 1),     "target": 80},
        {"id": "fluency_80",      "title": "Smooth Talker",  "description": "Average fluency score above 80%",       "category": "skill",    "icon": "zap",      "earned": avg_fluency >= 80,      "progress": round(min(avg_fluency, 80.0), 1),      "target": 80},
        {"id": "pronunciation_80","title": "Clear Voice",    "description": "Average pronunciation score above 80%", "category": "skill",    "icon": "mic",      "earned": avg_pronunciation >= 80,"progress": round(min(avg_pronunciation, 80.0), 1),"target": 80},
        {"id": "all_rounder",     "title": "All-Rounder",    "description": "All skill scores above 75%",             "category": "skill",    "icon": "award",    "earned": avg_accuracy >= 75 and avg_fluency >= 75 and avg_pronunciation >= 75, "progress": round(min(avg_accuracy, avg_fluency, avg_pronunciation, 75.0), 1), "target": 75},
    ]

    earned = [a for a in ACHIEVEMENTS if a["earned"]]
    locked = [a for a in ACHIEVEMENTS if not a["earned"]]

    return {
        "total_earned": len(earned),
        "total_available": len(ACHIEVEMENTS),
        "earned": earned,
        "locked": locked,
    }
