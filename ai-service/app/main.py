from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.transcribe import router as transcribe_router
from app.services.whisper_service import WhisperService


@asynccontextmanager
async def lifespan(app: FastAPI):
    WhisperService.load()   # Load model weights at startup
    yield


app = FastAPI(title="Whisper STT Service", version="1.0.0", lifespan=lifespan)
app.include_router(transcribe_router)


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": WhisperService.is_loaded()}
