from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson, PdfExtractionStatus
from app.repositories.base import BaseRepository


class LessonRepository(BaseRepository[Lesson]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Lesson, db)

    async def get_by_section(self, section_id: UUID, published_only: bool = False) -> list[Lesson]:
        stmt = select(Lesson).where(Lesson.section_id == section_id)
        if published_only:
            stmt = stmt.where(Lesson.is_published == True)
        stmt = stmt.order_by(Lesson.display_order.asc(), Lesson.created_at.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_next_display_order(self, section_id: UUID) -> int:
        result = await self.db.execute(
            select(func.max(Lesson.display_order)).where(Lesson.section_id == section_id)
        )
        max_order = result.scalar_one_or_none()
        return (max_order or 0) + 1

    async def reorder(self, lesson_ids: list[UUID]) -> None:
        for i, lid in enumerate(lesson_ids):
            stmt = select(Lesson).where(Lesson.id == lid)
            lesson = (await self.db.execute(stmt)).scalar_one_or_none()
            if lesson:
                lesson.display_order = i
        await self.db.flush()

    async def count_by_section(self, section_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Lesson).where(Lesson.section_id == section_id)
        )
        return result.scalar_one()
