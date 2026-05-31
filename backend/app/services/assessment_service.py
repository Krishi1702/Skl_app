from __future__ import annotations

import json

import httpx

from app.core.config import settings

ASSESSMENT_SCHEMA = {
    "accuracy_score": 0.0,
    "fluency_score": 0.0,
    "pronunciation_score": 0.0,
    "overall_score": 0.0,
    "words_per_minute": 0,
    "pause_count": 0,
    "filler_word_count": 0,
    "mispronounced_words": [],
    "pronunciation_issues": [],
    "grammatical_mistakes": [],
    "strength_tags": [],
    "weakness_tags": [],
    "summary": "",
}

SYSTEM_PROMPT = (
    "You are a school reading assessment engine. "
    "Compare the student transcript to the lesson text and return ONLY valid JSON, no extra text. "
    "overall_score = accuracy_score*0.40 + fluency_score*0.30 + pronunciation_score*0.30. "
    "All scores 0-100."
)


async def transcribe_audio(audio_bytes: bytes, language: str) -> str:
    lang_code = "ta" if language == "tamil" else "en"
    async with httpx.AsyncClient(timeout=300) as client:
        response = await client.post(
            f"{settings.WHISPER_SERVICE_URL}/transcribe",
            files={"audio": ("recording.webm", audio_bytes, "audio/webm")},
            data={"language": lang_code},
        )
        response.raise_for_status()
        return response.json()["transcript"]


async def assess_reading(pdf_text: str, transcript: str, language: str) -> dict:
    lang_name = "Tamil" if language == "tamil" else "English"
    # Keep prompt short — small/fast models perform better with concise input
    prompt = (
        f"Language: {lang_name}\n"
        f"LESSON:\n{pdf_text[:1500]}\n\n"
        f"STUDENT:\n{transcript[:1000]}\n\n"
        f"JSON schema:\n{json.dumps(ASSESSMENT_SCHEMA)}"
    )

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_ctx": 2048,      # smaller context = faster inference
            "num_predict": 400,   # cap output tokens
            "num_thread": 6,      # use more CPU cores
        },
    }

    async with httpx.AsyncClient(timeout=180) as client:
        response = await client.post(f"{settings.OLLAMA_URL}/api/chat", json=payload)
        response.raise_for_status()
        content = response.json()["message"]["content"]
        result = json.loads(content)

    for key in ("accuracy_score", "fluency_score", "pronunciation_score", "overall_score"):
        result[key] = max(0.0, min(100.0, float(result.get(key, 0))))

    return result
