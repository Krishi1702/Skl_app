from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.dependencies import AdminUser, DbSession
from app.models.assignment import StudentSectionAssignment
from app.models.section import Section
from app.models.user import UserRole
from app.repositories.assignment_repo import StudentAssignmentRepository
from app.repositories.user_repo import UserRepository
from app.schemas.assignment import CreateStudentAssignmentIn, MoveStudentIn

router = APIRouter()


def _serialize(a: StudentSectionAssignment) -> dict:
    section = a.section
    school_class = section.school_class if section else None
    student = a.student
    return {
        "id": a.id,
        "student_id": a.student_id,
        "student_name": student.full_name if student else "",
        "student_email": student.email if student else "",
        "section_id": a.section_id,
        "section_name": section.name if section else "",
        "class_name": school_class.name if school_class else "",
        "is_active": a.is_active,
        "assigned_at": a.assigned_at,
        "unassigned_at": a.unassigned_at,
    }


async def _load_enriched(db, assignment_id: UUID) -> StudentSectionAssignment:
    stmt = (
        select(StudentSectionAssignment)
        .where(StudentSectionAssignment.id == assignment_id)
        .options(
            selectinload(StudentSectionAssignment.student),
            selectinload(StudentSectionAssignment.section).selectinload(Section.school_class),
        )
    )
    return (await db.execute(stmt)).scalar_one()


@router.get("")
async def list_student_assignments(
    db: DbSession, _: AdminUser,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    section_id: UUID | None = None, is_active: bool = True,
):
    filters = [StudentSectionAssignment.is_active == is_active]
    if section_id:
        filters.append(StudentSectionAssignment.section_id == section_id)

    count_stmt = select(func.count()).select_from(StudentSectionAssignment).where(*filters)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(StudentSectionAssignment)
        .where(*filters)
        .options(
            selectinload(StudentSectionAssignment.student),
            selectinload(StudentSectionAssignment.section).selectinload(Section.school_class),
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
async def assign_student(body: CreateStudentAssignmentIn, db: DbSession, admin: AdminUser):
    user_repo = UserRepository(db)
    student = await user_repo.get_by_id(body.student_id)
    if not student or student.role != UserRole.student:
        raise HTTPException(status_code=400, detail="User is not a student")

    repo = StudentAssignmentRepository(db)
    existing = await repo.get_active_for_student(body.student_id)
    if existing:
        raise HTTPException(status_code=409, detail="Student is already assigned to a section. Use move endpoint.")

    assignment = await repo.create(
        student_id=body.student_id,
        section_id=body.section_id,
        assigned_by=admin.id,
        is_active=True,
        assigned_at=datetime.now(timezone.utc),
    )
    await db.flush()
    enriched = await _load_enriched(db, assignment.id)
    return _serialize(enriched)


@router.put("/{studentId}/move")
async def move_student(studentId: UUID, body: MoveStudentIn, db: DbSession, admin: AdminUser):
    repo = StudentAssignmentRepository(db)
    current = await repo.get_active_for_student(studentId)
    if not current:
        raise HTTPException(status_code=400, detail="Student has no active section assignment")
    if current.section_id == body.new_section_id:
        raise HTTPException(status_code=409, detail="Student is already in this section")

    now = datetime.now(timezone.utc)
    current.is_active = False
    current.unassigned_at = now
    await repo.save(current)

    new_assignment = await repo.create(
        student_id=studentId,
        section_id=body.new_section_id,
        assigned_by=admin.id,
        is_active=True,
        assigned_at=now,
    )
    await db.flush()
    enriched = await _load_enriched(db, new_assignment.id)
    return _serialize(enriched)
