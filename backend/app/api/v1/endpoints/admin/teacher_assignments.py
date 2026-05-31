from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.dependencies import AdminUser, DbSession
from app.models.assignment import TeacherSectionAssignment
from app.models.section import Section
from app.models.user import UserRole
from app.repositories.assignment_repo import TeacherAssignmentRepository
from app.repositories.user_repo import UserRepository
from app.schemas.assignment import CreateTeacherAssignmentIn

router = APIRouter()


def _serialize(a: TeacherSectionAssignment) -> dict:
    section = a.section
    school_class = section.school_class if section else None
    teacher = a.teacher
    return {
        "id": a.id,
        "teacher_id": a.teacher_id,
        "teacher_name": teacher.full_name if teacher else "",
        "teacher_email": teacher.email if teacher else "",
        "section_id": a.section_id,
        "section_name": section.name if section else "",
        "class_name": school_class.name if school_class else "",
        "is_active": a.is_active,
        "assigned_at": a.assigned_at,
        "unassigned_at": a.unassigned_at,
    }


@router.get("")
async def list_teacher_assignments(
    db: DbSession, _: AdminUser,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    teacher_id: UUID | None = None, section_id: UUID | None = None, is_active: bool = True,
):
    filters = [TeacherSectionAssignment.is_active == is_active]
    if teacher_id:
        filters.append(TeacherSectionAssignment.teacher_id == teacher_id)
    if section_id:
        filters.append(TeacherSectionAssignment.section_id == section_id)

    count_stmt = select(func.count()).select_from(TeacherSectionAssignment).where(*filters)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(TeacherSectionAssignment)
        .where(*filters)
        .options(
            selectinload(TeacherSectionAssignment.teacher),
            selectinload(TeacherSectionAssignment.section).selectinload(Section.school_class),
        )
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = list((await db.execute(stmt)).scalars().all())
    total_pages = max(1, (total + limit - 1) // limit)

    return {
        "data": [_serialize(a) for a in items],
        "pagination": {"total": total, "page": page, "limit": limit, "total_pages": total_pages},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def assign_teacher(body: CreateTeacherAssignmentIn, db: DbSession, admin: AdminUser):
    user_repo = UserRepository(db)
    teacher = await user_repo.get_by_id(body.teacher_id)
    if not teacher or teacher.role != UserRole.teacher:
        raise HTTPException(status_code=400, detail="User is not a teacher")

    repo = TeacherAssignmentRepository(db)
    existing = await repo.get_active(body.teacher_id, body.section_id)
    if existing:
        raise HTTPException(status_code=409, detail="Teacher already assigned to this section")

    assignment = await repo.create(
        teacher_id=body.teacher_id,
        section_id=body.section_id,
        assigned_by=admin.id,
        is_active=True,
        assigned_at=datetime.now(timezone.utc),
    )
    await db.flush()

    # Reload with relationships for the response
    stmt = (
        select(TeacherSectionAssignment)
        .where(TeacherSectionAssignment.id == assignment.id)
        .options(
            selectinload(TeacherSectionAssignment.teacher),
            selectinload(TeacherSectionAssignment.section).selectinload(Section.school_class),
        )
    )
    enriched = (await db.execute(stmt)).scalar_one()
    return _serialize(enriched)


@router.delete("/{assignmentId}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_teacher_assignment(assignmentId: UUID, db: DbSession, _: AdminUser):
    repo = TeacherAssignmentRepository(db)
    assignment = await repo.get_by_id(assignmentId)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment.is_active = False
    assignment.unassigned_at = datetime.now(timezone.utc)
    await repo.save(assignment)
