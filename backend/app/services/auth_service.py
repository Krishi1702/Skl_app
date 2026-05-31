from __future__ import annotations

import hashlib
import time

import redis.asyncio as aioredis
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.repositories.user_repo import UserRepository
from app.schemas.auth import LoginIn, RegisterIn, TokenOut
from app.schemas.user import UserOut

_DENYLIST_PREFIX = "revoked_token:"


def _token_redis_key(token: str) -> str:
    return _DENYLIST_PREFIX + hashlib.sha256(token.encode()).hexdigest()


async def revoke_token(token: str) -> None:
    """Store a refresh token's hash in Redis until its natural expiry."""
    payload = decode_token(token)
    exp = payload.get("exp")
    if not exp:
        return
    ttl = int(exp - time.time()) + 60  # +60 s buffer
    if ttl <= 0:
        return
    r = aioredis.from_url(settings.REDIS_URL)
    try:
        await r.setex(_token_redis_key(token), ttl, "1")
    finally:
        await r.aclose()


async def is_token_revoked(token: str) -> bool:
    r = aioredis.from_url(settings.REDIS_URL)
    try:
        result = await r.get(_token_redis_key(token))
    finally:
        await r.aclose()
    return result is not None


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = UserRepository(db)

    async def register(self, data: RegisterIn) -> dict:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = await self.repo.create(
            full_name=data.full_name,
            email=data.email.lower(),
            password_hash=hash_password(data.password),
            role=UserRole(data.role),
            is_active=False,  # Inactive until admin approves
        )
        return {
            "message": "Account created. Awaiting admin approval before you can log in.",
            "user_id": user.id,
        }

    async def login(self, data: LoginIn) -> TokenOut:
        user = await self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account pending admin approval. Contact your admin.",
                headers={"X-Error-Code": "ACCOUNT_INACTIVE"},
            )

        access = create_access_token(str(user.id))
        refresh = create_refresh_token(str(user.id))
        return TokenOut(
            access_token=access,
            refresh_token=refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )

    async def refresh(self, refresh_token: str) -> dict:
        if await is_token_revoked(refresh_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )

        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        from uuid import UUID
        user = await self.repo.get_by_id(UUID(payload["sub"]))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        access = create_access_token(str(user.id))
        return {"access_token": access, "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60}
