from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.whisper_service import WhisperService

router = APIRouter()


class TranscribeResponse(BaseModel):
    transcript: str
    word_timestamps: list[dict]
    duration: float
    language_detected: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    audio: UploadFile = File(..., description="Audio file in WebM or OGG format"),
    language: str = Form("en", description="Language code: 'en' or 'ta'"),
):
    if language not in ("en", "ta"):
        raise HTTPException(status_code=400, detail="language must be 'en' or 'ta'")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        result = WhisperService.transcribe(audio_bytes, language=language)
        return TranscribeResponse(**result)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
