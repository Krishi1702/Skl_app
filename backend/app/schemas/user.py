from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime


class AdminUserView(UserOut):
    assigned_section: dict | None = None
    assigned_sections: list[dict] | None = None


class UpdateRoleIn(BaseModel):
    role: UserRole


class UpdateStatusIn(BaseModel):
    is_active: bool
