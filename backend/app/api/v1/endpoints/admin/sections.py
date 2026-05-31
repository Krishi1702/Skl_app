from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.core.dependencies import AdminUser, DbSession
from app.models.class_ import SchoolClass
from app.models.section import Section
from app.schemas.section import CreateSectionIn, SectionOut, UpdateSectionIn, UpdateStatusIn

router = APIRouter()


@router.get("")
async def list_sections(
    db: DbSession, _: AdminUser,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    class_id: UUID | None = None, include_inactive: bool = False,
):
    stmt = select(Section)
    if class_id:
        stmt = stmt.where(Section.class_id == class_id)
    if not include_inactive:
        stmt = stmt.where(Section.is_active == True)
    count = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    sections = list((await db.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all())
    return {"data": sections, "pagination": {"total": count, "page": page, "limit": limit}}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_section(body: CreateSectionIn, db: DbSession, _: AdminUser):
    school_class = (await db.execute(select(SchoolClass).where(SchoolClass.id == body.class_id))).scalar_one_or_none()
    if not school_class:
        raise HTTPException(status_code=404, detail="Class not found")
    existing = (await db.execute(
        select(Section).where(Section.class_id == body.class_id, Section.name == body.name)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail=f"Section '{body.name}' already exists in this class")
    s = Section(class_id=body.class_id, name=body.name)
    db.add(s)
    await db.flush()
    await db.refresh(s)
    return s


@router.get("/{sectionId}")
async def get_section(sectionId: UUID, db: DbSession, _: AdminUser):
    s = (await db.execute(select(Section).where(Section.id == sectionId))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Section not found")
    return s


@router.put("/{sectionId}")
async def update_section(sectionId: UUID, body: UpdateSectionIn, db: DbSession, _: AdminUser):
    s = (await db.execute(select(Section).where(Section.id == sectionId))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Section not found")
    s.name = body.name
    await db.flush()
    return s


@router.patch("/{sectionId}/status")
async def update_section_status(sectionId: UUID, body: UpdateStatusIn, db: DbSession, _: AdminUser):
    s = (await db.execute(select(Section).where(Section.id == sectionId))).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Section not found")
    s.is_active = body.is_active
    await db.flush()
    return s
