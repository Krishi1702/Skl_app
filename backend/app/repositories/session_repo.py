from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reading_session import AssessmentStatus, ReadingSession, SessionStatus
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[ReadingSession]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(ReadingSession, db)

    async def get_next_attempt_number(self, student_id: UUID, lesson_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(ReadingSession).where(
                ReadingSession.student_id == student_id,
                ReadingSession.lesson_id == lesson_id,
            )
        )
        return (result.scalar_one() or 0) + 1

    async def get_by_student_lesson(self, student_id: UUID, lesson_id: UUID) -> list[ReadingSession]:
        result = await self.db.execute(
            select(ReadingSession)
            .where(ReadingSession.student_id == student_id, ReadingSession.lesson_id == lesson_id)
            .order_by(ReadingSession.started_at.desc())
        )
        return list(result.scalars().all())

    async def get_pending_assessments(self) -> list[ReadingSession]:
        result = await self.db.execute(
            select(ReadingSession).where(
                ReadingSession.assessment_status == AssessmentStatus.pending,
                ReadingSession.status == SessionStatus.completed,
                ReadingSession.retry_count < 3,
            )
        )
        return list(result.scalars().all())

    async def get_best_score(self, student_id: UUID, lesson_id: UUID) -> float | None:
        from app.models.assessment_result import AssessmentResult
        result = await self.db.execute(
            select(func.max(AssessmentResult.overall_score))
            .join(ReadingSession, ReadingSession.id == AssessmentResult.session_id)
            .where(
                ReadingSession.student_id == student_id,
                ReadingSession.lesson_id == lesson_id,
                ReadingSession.status == SessionStatus.completed,
            )
        )
        return result.scalar_one_or_none()
