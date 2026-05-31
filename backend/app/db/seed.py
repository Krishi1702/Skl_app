"""Run with: docker compose exec backend python -m app.db.seed"""
from __future__ import annotations

import asyncio

from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password


async def seed():
    async with AsyncSessionLocal() as db:
        existing = await db.get(User, None)
        # Check if admin already exists
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.role == UserRole.admin))
        admin = result.scalar_one_or_none()
        if admin:
            print("Admin user already exists — skipping seed.")
            return

        admin = User(
            full_name="School Admin",
            email="admin@school.edu",
            password_hash=hash_password("Admin@1234"),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"Created admin user: admin@school.edu / Admin@1234")


if __name__ == "__main__":
    asyncio.run(seed())
