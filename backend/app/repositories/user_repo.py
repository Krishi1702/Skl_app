from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        role: UserRole | None = None,
        is_active: bool | None = None,
        search: str | None = None,
    ) -> tuple[list[User], int]:
        from sqlalchemy import func, or_

        stmt = select(User)
        count_stmt = select(func.count()).select_from(User)

        if role is not None:
            stmt = stmt.where(User.role == role)
            count_stmt = count_stmt.where(User.role == role)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
            count_stmt = count_stmt.where(User.is_active == is_active)
        if search:
            like = f"%{search}%"
            cond = or_(User.full_name.ilike(like), User.email.ilike(like))
            stmt = stmt.where(cond)
            count_stmt = count_stmt.where(cond)

        total = (await self.db.execute(count_stmt)).scalar_one()
        stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
        users = list((await self.db.execute(stmt)).scalars().all())
        return users, total
