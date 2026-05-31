from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.schemas.user import UserOut


class RegisterIn(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Literal["student", "teacher"]

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return v.lower()


class RegisterOut(BaseModel):
    message: str
    user_id: UUID


class LoginIn(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return v.lower()


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: UserOut


class RefreshIn(BaseModel):
    refresh_token: str


class AccessTokenOut(BaseModel):
    access_token: str
    expires_in: int
