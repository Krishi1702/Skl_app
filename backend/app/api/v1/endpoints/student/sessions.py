from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.core.dependencies import DbSession, StudentUser
from app.models.assignment import StudentSectionAssignment
from app.models.lesson import Lesson, PdfExtractionStatus
from app.models.reading_session import AssessmentStatus, ReadingSession, SessionStatus
from app.repositories.session_repo import SessionRepository
from app.schemas.session import StartSessionIn

router = APIRouter()

MAX_AUDIO_BYTES = 50 * 1024 * 1024  # 50 MB


async def _get_student_section(student_id: UUID, db) -> UUID:
    r = await db.execute(
        select(StudentSectionAssignment.section_id).where(
            StudentSectionAssignment.student_id == student_id,
            StudentSectionAssignment.is_active == True,
        )
    )
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=412, detail="You have not been assigned to a section yet.")
    return row


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def start_session(body: StartSessionIn, db: DbSession, student: StudentUser):
    section_id = await _get_student_section(student.id, db)

    lesson = await db.get(Lesson, body.lesson_id)
    if not lesson or lesson.section_id != section_id or not lesson.is_published:
        raise HTTPException(status_code=400, detail="Lesson not available")
    if lesson.pdf_extraction_status != PdfExtractionStatus.success:
        raise HTTPException(status_code=400, detail="Lesson is still being processed. Try again shortly.")

    repo = SessionRepository(db)
    attempt_num = await repo.get_next_attempt_number(student.id, body.lesson_id)

    session = await repo.create(
        student_id=student.id,
        lesson_id=body.lesson_id,
        attempt_number=attempt_num,
        status=SessionStatus.in_progress,
        language=body.language,
        assessment_status=AssessmentStatus.pending,
        started_at=datetime.now(timezone.utc),
    )
    return {"session_id": session.id, "attempt_number": attempt_num, "started_at": session.started_at}


@router.get("/sessions/{sessionId}")
async def get_session(sessionId: UUID, db: DbSession, student: StudentUser):
    session = await db.get(ReadingSession, sessionId)
    if not session or session.student_id != student.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/sessions/{sessionId}/submit", status_code=status.HTTP_202_ACCEPTED)
async def submit_session(
    sessionId: UUID,
    db: DbSession,
    student: StudentUser,
    audio: UploadFile = File(...),
    duration_seconds: int = Form(0),
):
    session = await db.get(ReadingSession, sessionId)
    if not session or session.student_id != student.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.in_progress:
        raise HTTPException(status_code=400, detail="Session is not in_progress")

    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio must be under 50 MB")

    # Transcribe immediately — audio bytes are never written to storage or Redis
    from app.services.assessment_service import transcribe_audio
    try:
        transcript = await transcribe_audio(audio_bytes, session.language)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Transcription service unavailable. Please try again.",
        )
    finally:
        del audio_bytes  # explicit discard

    now = datetime.now(timezone.utc)
    session.status = SessionStatus.completed
    session.assessment_status = AssessmentStatus.processing
    session.duration_seconds = duration_seconds
    session.completed_at = now
    await db.flush()

    # Enqueue only the lightweight transcript string — no audio bytes in Redis
    from app.core.config import settings
    from arq import create_pool
    from arq.connections import RedisSettings
    pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    await pool.enqueue_job("run_assessment", str(sessionId), transcript)
    await pool.aclose()

    return {
        "session_id": sessionId,
        "assessment_status": "processing",
        "message": "Your reading is being assessed. You will be notified when ready.",
    }


@router.patch("/sessions/{sessionId}/abandon")
async def abandon_session(sessionId: UUID, db: DbSession, student: StudentUser):
    session = await db.get(ReadingSession, sessionId)
    if not session or session.student_id != student.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.in_progress:
        raise HTTPException(status_code=400, detail="Only in_progress sessions can be abandoned")
    session.status = SessionStatus.abandoned
    await db.flush()
    return {"session_id": sessionId, "status": "abandoned"}


@router.get("/sessions/{sessionId}/result")
async def get_session_result(sessionId: UUID, db: DbSession, student: StudentUser):
    session = await db.get(ReadingSession, sessionId)
    if not session or session.student_id != student.id:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.assessment_status in (AssessmentStatus.pending, AssessmentStatus.processing):
        return JSONResponse(
            status_code=202,
            content={
                "assessment_status": session.assessment_status.value,
                "message": "Assessment is in progress. Please wait or listen for the Socket.io notification.",
            },
        )
    if session.assessment_status == AssessmentStatus.failed:
        raise HTTPException(status_code=424, detail="Assessment failed after retries. Please start a new session.")

    from app.models.assessment_result import AssessmentResult
    result = (
        await db.execute(select(AssessmentResult).where(AssessmentResult.session_id == sessionId))
    ).scalar_one_or_none()
    if not result:
        return JSONResponse(
            status_code=202,
            content={"assessment_status": "processing", "message": "Assessment not yet available."},
        )
    return {"session": session, "result": result}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str, db: DbSession):
    """Real-time notifications for assessment completion via Redis pub/sub."""
    from app.core.security import decode_token
    payload = decode_token(token)
    if not payload.get("sub"):
        await websocket.close(code=1008)
        return

    student_id = payload["sub"]
    await websocket.accept()

    import redis.asyncio as aioredis
    from app.core.config import settings
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"assessment:{student_id}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe()
        await r.aclose()
