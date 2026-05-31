from __future__ import annotations

import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select

from app.core.dependencies import DbSession, TeacherUser
from app.models.assignment import TeacherSectionAssignment
from app.models.lesson import Language, Lesson, PdfExtractionStatus
from app.repositories.lesson_repo import LessonRepository
from app.schemas.lesson import ReorderLessonsIn, UpdateLessonIn

router = APIRouter()

MAX_PDF_BYTES = 50 * 1024 * 1024  # 50 MB


async def _verify_teacher_owns_section(teacher_id: UUID, section_id: UUID, db) -> None:
    result = await db.execute(
        select(TeacherSectionAssignment).where(
            TeacherSectionAssignment.teacher_id == teacher_id,
            TeacherSectionAssignment.section_id == section_id,
            TeacherSectionAssignment.is_active == True,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Section not assigned to you")


@router.get("/{sectionId}/lessons")
async def list_lessons(sectionId: UUID, db: DbSession, teacher: TeacherUser, is_published: bool | None = None):
    await _verify_teacher_owns_section(teacher.id, sectionId, db)
    repo = LessonRepository(db)
    lessons = await repo.get_by_section(sectionId, published_only=(is_published is True))
    return {"data": lessons}


@router.post("/{sectionId}/lessons", status_code=status.HTTP_201_CREATED)
async def upload_lesson(
    sectionId: UUID,
    db: DbSession,
    teacher: TeacherUser,
    title: str = Form(...),
    language: Language = Form(...),
    description: str | None = Form(None),
    is_published: bool = Form(False),
    pdf: UploadFile = File(...),
):
    await _verify_teacher_owns_section(teacher.id, sectionId, db)

    if pdf.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await pdf.read()
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF must be under 50 MB")

    from app.services.storage_service import StorageService
    key = f"lessons/{sectionId}/{uuid.uuid4()}.pdf"
    await StorageService.upload_file(key, content, "application/pdf")

    repo = LessonRepository(db)
    next_order = await repo.get_next_display_order(sectionId)
    lesson = await repo.create(
        section_id=sectionId,
        uploaded_by=teacher.id,
        title=title,
        description=description,
        language=language,
        pdf_storage_key=key,
        pdf_extraction_status=PdfExtractionStatus.pending,
        display_order=next_order,
        is_published=is_published,
    )

    # Queue PDF text extraction as background job via ARQ
    import redis.asyncio as aioredis
    from app.core.config import settings
    from arq import create_pool
    from arq.connections import RedisSettings
    pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    await pool.enqueue_job("extract_pdf_text", str(lesson.id), content)
    await pool.aclose()

    return lesson


@router.put("/{sectionId}/lessons/reorder")
async def reorder_lessons(sectionId: UUID, body: ReorderLessonsIn, db: DbSession, teacher: TeacherUser):
    await _verify_teacher_owns_section(teacher.id, sectionId, db)
    repo = LessonRepository(db)
    await repo.reorder(body.order)
    return {"message": "Lessons reordered successfully"}


@router.get("/{sectionId}/lessons/{lessonId}")
async def get_lesson(sectionId: UUID, lessonId: UUID, db: DbSession, teacher: TeacherUser):
    await _verify_teacher_owns_section(teacher.id, sectionId, db)
    repo = LessonRepository(db)
    lesson = await repo.get_by_id(lessonId)
    if not lesson or lesson.section_id != sectionId:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.patch("/{sectionId}/lessons/{lessonId}")
async def update_lesson(sectionId: UUID, lessonId: UUID, body: UpdateLessonIn, db: DbSession, teacher: TeacherUser):
    await _verify_teacher_owns_section(teacher.id, sectionId, db)
    repo = LessonRepository(db)
    lesson = await repo.get_by_id(lessonId)
    if not lesson or lesson.section_id != sectionId:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if body.title is not None:
        lesson.title = body.title
    if body.description is not None:
        lesson.description = body.description
    if body.language is not None:
        lesson.language = body.language
    if body.is_published is not None:
        lesson.is_published = body.is_published
    await repo.save(lesson)
    return lesson


@router.delete("/{sectionId}/lessons/{lessonId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(sectionId: UUID, lessonId: UUID, db: DbSession, teacher: TeacherUser, force: bool = False):
    await _verify_teacher_owns_section(teacher.id, sectionId, db)
    repo = LessonRepository(db)
    lesson = await repo.get_by_id(lessonId)
    if not lesson or lesson.section_id != sectionId:
        raise HTTPException(status_code=404, detail="Lesson not found")

    from sqlalchemy import func
    from app.models.reading_session import ReadingSession, SessionStatus
    count = (await db.execute(
        select(func.count()).select_from(ReadingSession).where(
            ReadingSession.lesson_id == lessonId,
            ReadingSession.status == SessionStatus.completed,
        )
    )).scalar_one()

    if count > 0 and not force:
        raise HTTPException(
            status_code=409,
            detail=f"{count} student sessions exist. Add ?force=true to delete anyway.",
        )

    from app.services.storage_service import StorageService
    await StorageService.delete_file(lesson.pdf_storage_key)
    await repo.delete(lesson)


@router.get("/{sectionId}/lessons/{lessonId}/pdf-url")
async def get_pdf_url(sectionId: UUID, lessonId: UUID, db: DbSession, teacher: TeacherUser):
    await _verify_teacher_owns_section(teacher.id, sectionId, db)
    repo = LessonRepository(db)
    lesson = await repo.get_by_id(lessonId)
    if not lesson or lesson.section_id != sectionId:
        raise HTTPException(status_code=404, detail="Lesson not found")

    from app.services.storage_service import StorageService
    url = await StorageService.generate_presigned_url(lesson.pdf_storage_key, 900)
    from datetime import timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=900)
    return {"url": url, "expires_at": expires_at}
