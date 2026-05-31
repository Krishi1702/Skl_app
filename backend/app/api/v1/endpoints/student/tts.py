from __future__ import annotations

import asyncio
import io

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from gtts import gTTS
from pydantic import BaseModel

from app.core.dependencies import StudentUser

router = APIRouter()

# tld='co.in' selects Google India servers — gives a clear Indian English accent
_LANG: dict[str, tuple[str, str]] = {
    "english": ("en", "co.in"),
    "tamil": ("ta", "co.in"),
}

_MAX_CHARS = 1200  # Keep short — gTTS is proportionally slower for longer texts


class TtsRequest(BaseModel):
    text: str
    language: str = "english"
    rate: str = "slow"  # "slow" → gTTS slow=True; anything else → normal speed


def _synthesize(text: str, lang: str, tld: str, slow: bool) -> bytes:
    buf = io.BytesIO()
    gTTS(text=text, lang=lang, tld=tld, slow=slow).write_to_fp(buf)
    buf.seek(0)
    return buf.read()


@router.post("/tts")
async def generate_tts(body: TtsRequest, student: StudentUser):
    text = body.text.strip()[:_MAX_CHARS]
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    lang, tld = _LANG.get(body.language, _LANG["english"])
    slow = body.rate == "slow"

    try:
        loop = asyncio.get_event_loop()
        audio = await loop.run_in_executor(None, _synthesize, text, lang, tld, slow)
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="TTS generation failed. Please try again.",
        ) from exc
