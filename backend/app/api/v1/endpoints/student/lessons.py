from __future__ import annotations

from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import DbSession, StudentUser
from app.models.assignment import StudentSectionAssignment
from app.models.lesson import Lesson, PdfExtractionStatus
from app.repositories.lesson_repo import LessonRepository
from app.repositories.session_repo import SessionRepository

router = APIRouter()


async def _get_student_section(student_id: UUID, db) -> UUID:
    result = await db.execute(
        select(StudentSectionAssignment.section_id).where(
            StudentSectionAssignment.student_id == student_id,
            StudentSectionAssignment.is_active == True,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=412, detail="You have not been assigned to a section yet.")
    return row


def _lesson_to_dict(
    lesson: Lesson,
    *,
    my_best_score=None,
    my_attempt_count=0,
    completion_status="not_started",
    include_text: bool = False,
) -> dict:
    """Serialize a Lesson ORM object to the flat dict the frontend expects."""
    d = {
        "id": lesson.id,
        "section_id": lesson.section_id,
        "uploaded_by_id": lesson.uploaded_by,
        "uploaded_by_name": lesson.uploaded_by_user.full_name if lesson.uploaded_by_user else "",
        "title": lesson.title,
        "description": lesson.description,
        "language": lesson.language.value if hasattr(lesson.language, "value") else lesson.language,
        "pdf_extraction_status": (
            lesson.pdf_extraction_status.value
            if hasattr(lesson.pdf_extraction_status, "value")
            else lesson.pdf_extraction_status
        ),
        "display_order": lesson.display_order,
        "is_published": lesson.is_published,
        "created_at": lesson.created_at,
        "updated_at": lesson.updated_at,
        "my_best_score": my_best_score,
        "my_attempt_count": my_attempt_count,
        "completion_status": completion_status,
    }
    if include_text:
        # Provide extracted text for the TTS listen feature
        d["extracted_text"] = lesson.pdf_extracted_text or ""
    return d


@router.get("")
async def list_lessons(db: DbSession, student: StudentUser):
    section_id = await _get_student_section(student.id, db)

    # Eager-load uploader so we can include uploaded_by_name
    stmt = (
        select(Lesson)
        .where(Lesson.section_id == section_id, Lesson.is_published == True)
        .options(selectinload(Lesson.uploaded_by_user))
        .order_by(Lesson.display_order.asc(), Lesson.created_at.asc())
    )
    lessons = list((await db.execute(stmt)).scalars().all())

    s_repo = SessionRepository(db)
    result = []
    for lesson in lessons:
        best = await s_repo.get_best_score(student.id, lesson.id)
        count = len(await s_repo.get_by_student_lesson(student.id, lesson.id))
        status = "not_started" if count == 0 else ("completed" if best is not None else "in_progress")
        result.append(_lesson_to_dict(lesson, my_best_score=best, my_attempt_count=count, completion_status=status))

    return {"section_name": "", "data": result}


@router.get("/{lessonId}")
async def get_lesson(lessonId: UUID, db: DbSession, student: StudentUser):
    section_id = await _get_student_section(student.id, db)

    # Eager-load uploader for the name field
    stmt = (
        select(Lesson)
        .where(Lesson.id == lessonId)
        .options(selectinload(Lesson.uploaded_by_user))
    )
    lesson = (await db.execute(stmt)).scalar_one_or_none()

    if not lesson or lesson.section_id != section_id or not lesson.is_published:
        raise HTTPException(status_code=404, detail="Lesson not found")

    s_repo = SessionRepository(db)
    attempts_raw = await s_repo.get_by_student_lesson(student.id, lessonId)
    best = await s_repo.get_best_score(student.id, lessonId)
    count = len(attempts_raw)
    status = "not_started" if count == 0 else ("completed" if best is not None else "in_progress")

    lesson_dict = _lesson_to_dict(lesson, my_best_score=best, my_attempt_count=count, completion_status=status, include_text=True)
    lesson_dict["attempts"] = [
        {
            "session_id": a.id,
            "attempt_number": a.attempt_number,
            "overall_score": None,
            "completed_at": a.completed_at,
        }
        for a in attempts_raw
    ]
    return lesson_dict


@router.get("/{lessonId}/pdf-url")
async def get_pdf_url(lessonId: UUID, db: DbSession, student: StudentUser):
    section_id = await _get_student_section(student.id, db)

    stmt = select(Lesson).where(Lesson.id == lessonId)
    lesson = (await db.execute(stmt)).scalar_one_or_none()

    if not lesson or lesson.section_id != section_id:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if lesson.pdf_extraction_status == PdfExtractionStatus.failed:
        raise HTTPException(
            status_code=409,
            detail="This lesson could not be processed. Your teacher has been notified.",
        )

    from app.services.storage_service import StorageService
    url = await StorageService.generate_presigned_url(lesson.pdf_storage_key, 900)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=900)
    return {"url": url, "expires_at": expires_at}


@router.get("/{lessonId}/sessions")
async def lesson_sessions(lessonId: UUID, db: DbSession, student: StudentUser):
    repo = SessionRepository(db)
    sessions = await repo.get_by_student_lesson(student.id, lessonId)
    return {
        "lesson_id": lessonId,
        "lesson_title": "",
        "data": sessions,
    }
