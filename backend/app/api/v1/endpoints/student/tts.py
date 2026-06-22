from __future__ import annotations

import io
import logging
import re

import edge_tts
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.core.dependencies import StudentUser

router = APIRouter()
logger = logging.getLogger(__name__)

_VOICE_MAP: dict[str, str] = {
    "english": "en-IN-NeerjaNeural",
    "tamil":   "ta-IN-PallaviNeural",
}

# Rate aliases → SSML relative-rate strings.
# "slow" is -5% (just slightly under normal) — natural for a reference reading.
_RATE_ALIASES: dict[str, str] = {
    "slow":   "-15%",
    "normal": "+0%",
    "fast":   "+20%",
}

_MAX_CHARS = 5000

# ── Text normalisation ────────────────────────────────────────────────────────
# PDF-extracted text often has hard-wrapped lines (a newline every ~70 chars
# from the PDF column layout). The TTS engine treats every bare newline as a
# sentence boundary → each line is pronounced in isolation → robotic.
# We collapse those intra-paragraph newlines into spaces while keeping genuine
# paragraph breaks (two or more consecutive newlines).
_CRLF_RE      = re.compile(r'\r\n|\r')
_MULTI_NL_RE  = re.compile(r'\n{3,}')
_SINGLE_NL_RE = re.compile(r'(?<!\n)\n(?!\n)')   # lone \n that is NOT a paragraph break
_MULTI_SP_RE  = re.compile(r' {2,}')


class TtsRequest(BaseModel):
    text: str
    language: str = "english"
    rate: str = "slow"  # "slow" / "normal" / "fast" or raw SSML string e.g. "-10%"


def _normalize_text(text: str) -> str:
    text = _CRLF_RE.sub('\n', text)
    text = _MULTI_NL_RE.sub('\n\n', text)   # collapse 3+ newlines → paragraph break
    text = _SINGLE_NL_RE.sub(' ', text)     # hard-wrap joins → single space
    text = _MULTI_SP_RE.sub(' ', text)      # collapse double spaces
    return text.strip()


def _resolve_rate(rate: str) -> str:
    return _RATE_ALIASES.get(rate, rate)


async def _synthesize(text: str, voice: str, rate: str) -> bytes:
    communicate = edge_tts.Communicate(
        text,
        voice,
        rate=rate,
        boundary="SentenceBoundary",  # whole-sentence synthesis — not word-by-word
    )
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    buf.seek(0)
    data = buf.read()
    if not data:
        raise RuntimeError("edge-tts returned empty audio")
    return data


@router.post("/tts")
async def generate_tts(body: TtsRequest, student: StudentUser):
    text = _normalize_text(body.text)[:_MAX_CHARS]
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    voice = _VOICE_MAP.get(body.language, _VOICE_MAP["english"])
    rate = _resolve_rate(body.rate)

    try:
        audio = await _synthesize(text, voice, rate)
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as exc:
        logger.exception("TTS synthesis failed — voice=%s rate=%s error=%s", voice, rate, exc)
        raise HTTPException(
            status_code=503,
            detail="TTS generation failed. Please try again.",
        ) from exc
