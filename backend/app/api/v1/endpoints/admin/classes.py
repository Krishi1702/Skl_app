from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.core.dependencies import AdminUser, DbSession
from app.models.class_ import SchoolClass
from app.models.section import Section
from app.repositories.base import BaseRepository
from app.schemas.class_ import ClassOut, CreateClassIn, UpdateClassIn, UpdateStatusIn
from app.schemas.common import Pagination

router = APIRouter()


def _class_repo(db):
    return BaseRepository(SchoolClass, db)


@router.get("", response_model=dict)
async def list_classes(
    db: DbSession,
    _: AdminUser,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    include_inactive: bool = False,
):
    stmt = select(SchoolClass)
    if not include_inactive:
        stmt = stmt.where(SchoolClass.is_active == True)
    count = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    items = list((await db.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all())

    # Annotate with section_count
    result = []
    for c in items:
        sc = (await db.execute(select(func.count()).select_from(Section).where(Section.class_id == c.id))).scalar_one()
        result.append({**ClassOut.model_validate(c).model_dump(), "section_count": sc})

    return {
        "data": result,
        "pagination": Pagination(total=count, page=page, limit=limit, total_pages=(count + limit - 1) // limit),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_class(body: CreateClassIn, db: DbSession, _: AdminUser):
    existing = (await db.execute(select(SchoolClass).where(SchoolClass.name == body.name))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Class '{body.name}' already exists")
    c = SchoolClass(name=body.name)
    db.add(c)
    await db.flush()
    await db.refresh(c)
    return {**ClassOut.model_validate(c).model_dump(), "section_count": 0}


@router.get("/{classId}")
async def get_class(classId: UUID, db: DbSession, _: AdminUser):
    c = (await db.execute(select(SchoolClass).where(SchoolClass.id == classId))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    sections = list((await db.execute(select(Section).where(Section.class_id == classId))).scalars().all())
    return {**ClassOut.model_validate(c).model_dump(), "section_count": len(sections), "sections": sections}


@router.put("/{classId}")
async def update_class(classId: UUID, body: UpdateClassIn, db: DbSession, _: AdminUser):
    c = (await db.execute(select(SchoolClass).where(SchoolClass.id == classId))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    c.name = body.name
    await db.flush()
    return ClassOut.model_validate(c)


@router.patch("/{classId}/status")
async def update_class_status(classId: UUID, body: UpdateStatusIn, db: DbSession, _: AdminUser):
    c = (await db.execute(select(SchoolClass).where(SchoolClass.id == classId))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    c.is_active = body.is_active
    await db.flush()
    return ClassOut.model_validate(c)
