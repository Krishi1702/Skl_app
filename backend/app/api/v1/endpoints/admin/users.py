from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import AdminUser, DbSession
from app.models.user import UserRole
from app.repositories.user_repo import UserRepository
from app.schemas.user import UpdateRoleIn, UpdateStatusIn, UserOut

router = APIRouter()


@router.get("")
async def list_users(
    db: DbSession, _: AdminUser,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    role: UserRole | None = None, is_active: bool | None = None,
    search: str | None = None,
):
    repo = UserRepository(db)
    users, total = await repo.get_paginated(page=page, limit=limit, role=role, is_active=is_active, search=search)
    return {
        "data": [UserOut.model_validate(u) for u in users],
        "pagination": {"total": total, "page": page, "limit": limit},
    }


@router.get("/{userId}")
async def get_user(userId: UUID, db: DbSession, _: AdminUser):
    repo = UserRepository(db)
    user = await repo.get_by_id(userId)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user)


@router.patch("/{userId}/role")
async def update_role(userId: UUID, body: UpdateRoleIn, db: DbSession, admin: AdminUser):
    if userId == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    repo = UserRepository(db)
    user = await repo.get_by_id(userId)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.admin:
        raise HTTPException(status_code=400, detail="Cannot change admin role")
    user.role = body.role
    user.is_active = True   # Activate when role is assigned
    await repo.save(user)
    return UserOut.model_validate(user)


@router.patch("/{userId}/status")
async def update_status(userId: UUID, body: UpdateStatusIn, db: DbSession, admin: AdminUser):
    if userId == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    repo = UserRepository(db)
    user = await repo.get_by_id(userId)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = body.is_active
    await repo.save(user)
    return UserOut.model_validate(user)
