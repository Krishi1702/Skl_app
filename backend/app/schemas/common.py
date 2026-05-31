from __future__ import annotations

from pydantic import BaseModel


class Pagination(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: dict | None = None
