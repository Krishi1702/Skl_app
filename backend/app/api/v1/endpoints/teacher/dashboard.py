from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.core.dependencies import DbSession, TeacherUser
from app.models.assignment import StudentSectionAssignment, TeacherSectionAssignment
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

    from app.models.assessment_result import AssessmentResult
    from app.models.class_ import SchoolClass
    from app.models.lesson import Lesson
    from app.models.reading_session import AssessmentStatus, ReadingSession, SessionStatus
    from app.models.section import Section
    from app.models.skill_profile import StudentSkillProfile

    # ── Section name / class name ─────────────────────────────────────────────
    section = await db.get(Section, sectionId)
    section_name = section.name if section else ""
    class_name = ""
    if section:
        cls = await db.get(SchoolClass, section.class_id)
        class_name = cls.name if cls else ""

    # ── Student count ─────────────────────────────────────────────────────────
    total_students = (await db.execute(
        select(func.count()).select_from(StudentSectionAssignment).where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
        )
    )).scalar_one()

    # ── Active students last 7 days ───────────────────────────────────────────
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_students = (await db.execute(
        select(func.count(func.distinct(ReadingSession.student_id)))
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == ReadingSession.student_id)
        .where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
            ReadingSession.status == SessionStatus.completed,
            ReadingSession.completed_at >= seven_days_ago,
        )
    )).scalar_one() or 0

    # ── Sessions this week (Mon–Sun) ──────────────────────────────────────────
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_start_dt = datetime(week_start.year, week_start.month, week_start.day, tzinfo=timezone.utc)

    total_sessions_this_week = (await db.execute(
        select(func.count())
        .select_from(ReadingSession)
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == ReadingSession.student_id)
        .where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
            ReadingSession.status == SessionStatus.completed,
            ReadingSession.completed_at >= week_start_dt,
        )
    )).scalar_one() or 0

    # ── Published lessons ─────────────────────────────────────────────────────
    lessons_published = (await db.execute(
        select(func.count()).select_from(Lesson).where(
            Lesson.section_id == sectionId,
            Lesson.is_published == True,
        )
    )).scalar_one()

    # ── All-time average scores for section ───────────────────────────────────
    score_row = (await db.execute(
        select(
            func.avg(AssessmentResult.overall_score),
            func.avg(AssessmentResult.accuracy_score),
            func.avg(AssessmentResult.fluency_score),
        )
        .join(ReadingSession, ReadingSession.id == AssessmentResult.session_id)
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == ReadingSession.student_id)
        .where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
            ReadingSession.status == SessionStatus.completed,
        )
    )).one()

    avg_overall = round(float(score_row[0]), 2) if score_row[0] else None
    avg_accuracy = round(float(score_row[1]), 2) if score_row[1] else None
    avg_fluency = round(float(score_row[2]), 2) if score_row[2] else None

    # ── Previous week average (for trend comparison) ──────────────────────────
    prev_week_start_dt = week_start_dt - timedelta(days=7)
    prev_score = (await db.execute(
        select(func.avg(AssessmentResult.overall_score))
        .join(ReadingSession, ReadingSession.id == AssessmentResult.session_id)
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == ReadingSession.student_id)
        .where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
            ReadingSession.status == SessionStatus.completed,
            AssessmentResult.assessed_at >= prev_week_start_dt,
            AssessmentResult.assessed_at < week_start_dt,
        )
    )).scalar_one_or_none()

    avg_overall_prev_week = round(float(prev_score), 2) if prev_score else None

    # ── Top leaderboard (up to 5 students by avg overall) ────────────────────
    top_rows = (await db.execute(
        select(
            User.id,
            User.full_name,
            StudentSkillProfile.avg_overall_score,
            StudentSkillProfile.total_sessions_completed,
        )
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == User.id)
        .join(StudentSkillProfile, StudentSkillProfile.student_id == User.id)
        .where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
        )
        .order_by(StudentSkillProfile.avg_overall_score.desc())
        .limit(5)
    )).all()

    top_leaderboard = [
        {
            "rank": i + 1,
            "student_id": str(row[0]),
            "student_name": row[1],
            "avg_overall_score": round(float(row[2]), 2),
            "sessions_completed": row[3],
            "composite_score": round(float(row[2]) * 0.7 + min(row[3] * 3, 30), 2),
            "is_current_user": False,
        }
        for i, row in enumerate(top_rows)
    ]

    return {
        "section": {"id": sectionId, "name": section_name, "class_name": class_name},
        "summary": {
            "total_students": total_students,
            "active_students_last_7_days": active_students,
            "avg_overall_score": avg_overall,
            "avg_overall_score_prev_week": avg_overall_prev_week,
            "avg_accuracy_score": avg_accuracy,
            "avg_fluency_score": avg_fluency,
            "total_sessions_this_week": total_sessions_this_week,
            "lessons_published": lessons_published,
        },
        "top_leaderboard": top_leaderboard,
    }


@router.get("/{sectionId}/students")
async def section_students(
    sectionId: UUID,
    db: DbSession,
    teacher: TeacherUser,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = None,
):
    await _verify_owns(teacher.id, sectionId, db)

    from app.models.assessment_result import AssessmentResult
    from app.models.reading_session import AssessmentStatus, ReadingSession, SessionStatus
    from app.models.skill_profile import StudentSkillProfile
    from app.models.streak import Streak

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

    total_count = (await db.execute(
        select(func.count()).select_from(stmt.subquery())
    )).scalar_one()

    students = list(
        (await db.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all()
    )

    # Pre-fetch section-wide rank ordering
    rank_rows = (await db.execute(
        select(StudentSkillProfile.student_id, StudentSkillProfile.avg_overall_score)
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == StudentSkillProfile.student_id)
        .where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
        )
        .order_by(StudentSkillProfile.avg_overall_score.desc())
    )).all()
    rank_map = {str(sid): i + 1 for i, (sid, _) in enumerate(rank_rows)}

    result = []
    for s in students:
        profile = (await db.execute(
            select(StudentSkillProfile).where(StudentSkillProfile.student_id == s.id)
        )).scalar_one_or_none()

        streak_row = (await db.execute(
            select(Streak).where(Streak.student_id == s.id)
        )).scalar_one_or_none()

        lessons_completed = (await db.execute(
            select(func.count(func.distinct(ReadingSession.lesson_id)))
            .join(AssessmentResult, AssessmentResult.session_id == ReadingSession.id)
            .where(
                ReadingSession.student_id == s.id,
                ReadingSession.status == SessionStatus.completed,
                ReadingSession.assessment_status == AssessmentStatus.completed,
            )
        )).scalar_one() or 0

        result.append({
            "student_id": str(s.id),
            "student_name": s.full_name,
            "lessons_completed": lessons_completed,
            "total_sessions": profile.total_sessions_completed if profile else 0,
            "avg_overall_score": round(float(profile.avg_overall_score), 2) if profile else None,
            "avg_accuracy_score": round(float(profile.avg_accuracy_score), 2) if profile else None,
            "avg_fluency_score": round(float(profile.avg_fluency_score), 2) if profile else None,
            "current_streak": streak_row.current_streak if streak_row else 0,
            "last_session_date": str(streak_row.last_session_date) if streak_row and streak_row.last_session_date else None,
            "current_rank": rank_map.get(str(s.id)),
        })

    return {
        "data": result,
        "pagination": {
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": max(1, (total_count + limit - 1) // limit),
        },
    }


@router.get("/{sectionId}/students/{studentId}/progress")
async def student_progress(
    sectionId: UUID,
    studentId: UUID,
    db: DbSession,
    teacher: TeacherUser,
    days: int = Query(30, ge=7, le=90),
):
    await _verify_owns(teacher.id, sectionId, db)

    student = await db.get(User, studentId)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    from app.models.assessment_result import AssessmentResult
    from app.models.lesson import Lesson
    from app.models.reading_session import ReadingSession, SessionStatus
    from app.models.skill_profile import StudentSkillProfile

    profile = (await db.execute(
        select(StudentSkillProfile).where(StudentSkillProfile.student_id == studentId)
    )).scalar_one_or_none()

    skill_profile = {
        "avg_accuracy_score": float(profile.avg_accuracy_score) if profile else 0.0,
        "avg_fluency_score": float(profile.avg_fluency_score) if profile else 0.0,
        "avg_pronunciation_score": float(profile.avg_pronunciation_score) if profile else 0.0,
        "avg_overall_score": float(profile.avg_overall_score) if profile else 0.0,
        "strength_tags": profile.strength_tags if profile else [],
        "weakness_tags": profile.weakness_tags if profile else [],
    }

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (await db.execute(
        select(ReadingSession, AssessmentResult, Lesson.title)
        .join(AssessmentResult, AssessmentResult.session_id == ReadingSession.id)
        .join(Lesson, Lesson.id == ReadingSession.lesson_id)
        .where(
            ReadingSession.student_id == studentId,
            ReadingSession.status == SessionStatus.completed,
            ReadingSession.completed_at >= cutoff,
        )
        .order_by(ReadingSession.completed_at.asc())
    )).all()

    skill_trend = [
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

    session_history = [
        {
            "session_id": str(row[0].id),
            "lesson_id": str(row[0].lesson_id),
            "lesson_title": row[2] or "",
            "attempt_number": row[0].attempt_number,
            "overall_score": float(row[1].overall_score),
            "accuracy_score": float(row[1].accuracy_score),
            "fluency_score": float(row[1].fluency_score),
            "pronunciation_score": float(row[1].pronunciation_score),
            "duration_seconds": row[0].duration_seconds,
            "completed_at": row[0].completed_at.isoformat() if row[0].completed_at else None,
        }
        for row in reversed(rows)
        if row[0].completed_at is not None
    ]

    return {
        "student": {"id": studentId, "full_name": student.full_name, "email": student.email},
        "skill_profile": skill_profile,
        "skill_trend": skill_trend,
        "session_history": session_history,
    }


@router.get("/{sectionId}/leaderboard")
async def section_leaderboard(
    sectionId: UUID,
    db: DbSession,
    teacher: TeacherUser,
    week_start: str | None = Query(None),
):
    await _verify_owns(teacher.id, sectionId, db)

    from app.models.assessment_result import AssessmentResult
    from app.models.class_ import SchoolClass
    from app.models.reading_session import ReadingSession, SessionStatus
    from app.models.section import Section
    from app.models.skill_profile import StudentSkillProfile

    # Determine week bounds
    if week_start:
        ws = date.fromisoformat(week_start)
    else:
        today = date.today()
        ws = today - timedelta(days=today.weekday())
    we = ws + timedelta(days=6)

    week_start_dt = datetime(ws.year, ws.month, ws.day, tzinfo=timezone.utc)
    week_end_dt = datetime(we.year, we.month, we.day, 23, 59, 59, tzinfo=timezone.utc)

    section_students = (await db.execute(
        select(User)
        .join(StudentSectionAssignment, StudentSectionAssignment.student_id == User.id)
        .where(
            StudentSectionAssignment.section_id == sectionId,
            StudentSectionAssignment.is_active == True,
        )
    )).scalars().all()

    entries = []
    for u in section_students:
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

        if sessions_count == 0:
            profile = (await db.execute(
                select(StudentSkillProfile).where(StudentSkillProfile.student_id == u.id)
            )).scalar_one_or_none()
            if not profile:
                entries.append({
                    "student_id": str(u.id),
                    "student_name": u.full_name,
                    "sessions_completed": 0,
                    "avg_overall_score": 0.0,
                    "avg_accuracy_score": 0.0,
                    "avg_fluency_score": 0.0,
                    "composite_score": 0.0,
                    "is_current_user": False,
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
            "is_current_user": False,
        })

    entries.sort(key=lambda x: x["composite_score"], reverse=True)
    for i, e in enumerate(entries, 1):
        e["rank"] = i

    section_row = await db.get(Section, sectionId)
    section_name = ""
    if section_row:
        cls = await db.get(SchoolClass, section_row.class_id)
        section_name = f"{cls.name} — {section_row.name}" if cls else section_row.name

    return {
        "section_name": section_name,
        "week_start": ws.isoformat(),
        "week_end": we.isoformat(),
        "entries": entries,
    }
