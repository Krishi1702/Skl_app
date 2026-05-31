"""ARQ background jobs: PDF extraction and AI reading assessment pipeline."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

logger = logging.getLogger(__name__)


async def extract_pdf_text(ctx, lesson_id: str, pdf_bytes: bytes) -> None:
    """Extract text from uploaded PDF and update lesson record."""
    from app.db.session import AsyncSessionLocal
    from app.models.lesson import Lesson, PdfExtractionStatus

    async with AsyncSessionLocal() as db:
        lesson = await db.get(Lesson, UUID(lesson_id))
        if not lesson:
            return
        try:
            from pypdf import PdfReader
            import io
            reader = PdfReader(io.BytesIO(pdf_bytes))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            lesson.pdf_extracted_text = text.strip()
            lesson.pdf_extraction_status = PdfExtractionStatus.success
            logger.info(f"PDF text extracted for lesson {lesson_id}: {len(text)} chars")
        except Exception as e:
            lesson.pdf_extraction_status = PdfExtractionStatus.failed
            logger.error(f"PDF extraction failed for lesson {lesson_id}: {e}")
        await db.commit()


async def run_assessment(ctx, session_id: str, transcript: str) -> None:
    """
    Assessment pipeline (STT is done in the API layer before this job is queued):
    1. Assess transcript via Ollama LLM
    2. Save result → update skill profile, streak, leaderboard
    3. Notify student via Redis pub/sub
    """
    from app.db.session import AsyncSessionLocal
    from app.models.reading_session import ReadingSession, AssessmentStatus
    from app.models.assessment_result import AssessmentResult
    from app.services.assessment_service import assess_reading
    from app.services.notification_service import publish_assessment_complete, publish_assessment_failed

    async with AsyncSessionLocal() as db:
        session = await db.get(ReadingSession, UUID(session_id))
        if not session:
            return

        try:
            session.transcript = transcript

            # Step 1: Load lesson PDF text
            from app.models.lesson import Lesson
            lesson = await db.get(Lesson, session.lesson_id)
            pdf_text = lesson.pdf_extracted_text or ""

            # Step 2: LLM Assessment
            logger.info(f"Running LLM assessment for session {session_id}")
            assessment_data = await assess_reading(pdf_text, transcript, session.language)

            # Step 4: Persist result
            result = AssessmentResult(
                session_id=session.id,
                accuracy_score=assessment_data["accuracy_score"],
                fluency_score=assessment_data["fluency_score"],
                pronunciation_score=assessment_data["pronunciation_score"],
                overall_score=assessment_data["overall_score"],
                words_per_minute=int(assessment_data.get("words_per_minute", 0)),
                pause_count=int(assessment_data.get("pause_count", 0)),
                filler_word_count=int(assessment_data.get("filler_word_count", 0)),
                mispronounced_words=assessment_data.get("mispronounced_words", []),
                pronunciation_issues=assessment_data.get("pronunciation_issues", []),
                grammatical_mistakes=assessment_data.get("grammatical_mistakes", []),
                strength_tags=assessment_data.get("strength_tags", []),
                weakness_tags=assessment_data.get("weakness_tags", []),
                summary_text=assessment_data.get("summary", ""),
                assessed_at=datetime.now(timezone.utc),
            )
            db.add(result)

            session.assessment_status = AssessmentStatus.completed
            await db.commit()

            # Step 5: Update analytics (streak, skill profile, leaderboard)
            await _update_analytics(session.student_id, session.lesson_id, assessment_data)

            # Step 6: Notify student
            await publish_assessment_complete(
                session.student_id, session.id, assessment_data["overall_score"]
            )
            logger.info(f"Assessment complete for session {session_id}")

        except Exception as e:
            logger.error(f"Assessment failed for session {session_id}: {e}")
            session.retry_count = (session.retry_count or 0) + 1
            if session.retry_count >= 3:
                session.assessment_status = AssessmentStatus.failed
                await publish_assessment_failed(session.student_id, session.id, str(e))
            await db.commit()


async def _update_analytics(student_id: UUID, lesson_id: UUID, assessment_data: dict) -> None:
    """Update running averages in StudentSkillProfile, Streak, and WeeklyLeaderboard."""
    from app.db.session import AsyncSessionLocal
    from app.models.skill_profile import StudentSkillProfile
    from app.models.streak import Streak
    from datetime import date, timedelta

    async with AsyncSessionLocal() as db:
        # ── Skill Profile ────────────────────────────────────────
        profile = (await db.execute(
            __import__('sqlalchemy', fromlist=['select']).select(StudentSkillProfile)
            .where(StudentSkillProfile.student_id == student_id)
        )).scalar_one_or_none()

        overall = assessment_data["overall_score"]
        accuracy = assessment_data["accuracy_score"]
        fluency = assessment_data["fluency_score"]
        pronunciation = assessment_data["pronunciation_score"]

        now = datetime.now(timezone.utc)

        if not profile:
            profile = StudentSkillProfile(
                student_id=student_id,
                avg_accuracy_score=accuracy,
                avg_fluency_score=fluency,
                avg_pronunciation_score=pronunciation,
                avg_overall_score=overall,
                total_sessions_completed=1,
                total_lessons_completed=1,
                strength_tags=assessment_data.get("strength_tags", []),
                weakness_tags=assessment_data.get("weakness_tags", []),
                last_updated_at=now,
            )
            db.add(profile)
        else:
            n = profile.total_sessions_completed
            profile.avg_accuracy_score = (float(profile.avg_accuracy_score) * n + accuracy) / (n + 1)
            profile.avg_fluency_score = (float(profile.avg_fluency_score) * n + fluency) / (n + 1)
            profile.avg_pronunciation_score = (float(profile.avg_pronunciation_score) * n + pronunciation) / (n + 1)
            profile.avg_overall_score = (float(profile.avg_overall_score) * n + overall) / (n + 1)
            profile.total_sessions_completed += 1
            profile.strength_tags = assessment_data.get("strength_tags", profile.strength_tags)
            profile.weakness_tags = assessment_data.get("weakness_tags", profile.weakness_tags)
            profile.last_updated_at = now

        # ── Streak ───────────────────────────────────────────────
        today = date.today()
        streak = (await db.execute(
            __import__('sqlalchemy', fromlist=['select']).select(Streak)
            .where(Streak.student_id == student_id)
        )).scalar_one_or_none()

        if not streak:
            streak = Streak(student_id=student_id, current_streak=1, longest_streak=1, last_session_date=today, updated_at=now)
            db.add(streak)
        else:
            if streak.last_session_date == today:
                pass  # Already counted today
            elif streak.last_session_date == today - timedelta(days=1):
                streak.current_streak += 1
            else:
                streak.current_streak = 1
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
            streak.last_session_date = today
            streak.updated_at = now

        await db.commit()
