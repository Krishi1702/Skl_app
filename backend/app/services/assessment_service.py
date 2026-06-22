from __future__ import annotations

import json
import logging
import re

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Schema given to the LLM — intentionally excludes WPM / pauses / fillers,
# which are computed deterministically from Whisper timing data.
ASSESSMENT_SCHEMA = {
    "accuracy_score": 0.0,
    "fluency_score": 0.0,
    "pronunciation_score": 0.0,
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
    "All scores must be numbers between 0 and 100."
)

# Filler words detectable from the transcript text.
_FILLER_RE = re.compile(r"\b(um+|uh+|er+|ah+|hmm+|you\s+know)\b", re.IGNORECASE)

# Minimum inter-word gap (seconds) that counts as a reading pause.
_PAUSE_THRESHOLD = 0.5


async def transcribe_audio(audio_bytes: bytes, language: str) -> dict:
    """
    Call the Whisper service and return the full response:
    {transcript, word_timestamps, duration, language_detected}
    """
    lang_code = "ta" if language == "tamil" else "en"
    async with httpx.AsyncClient(timeout=300) as client:
        response = await client.post(
            f"{settings.WHISPER_SERVICE_URL}/transcribe",
            files={"audio": ("recording.webm", audio_bytes, "audio/webm")},
            data={"language": lang_code},
        )
        response.raise_for_status()
        return response.json()


def compute_reading_metrics(
    word_timestamps: list[dict], duration: float, transcript: str
) -> dict:
    """
    Compute WPM, pause count, and filler count from Whisper timing data.
    All three values are deterministic — never estimated by the LLM.

    word_timestamps: list of {word, start, end} from Whisper
    duration:        total audio duration in seconds (from Whisper info)
    transcript:      plain-text transcript (for filler word regex)
    """
    word_count = len(word_timestamps)
    minutes = duration / 60.0 if duration > 0 else 0
    wpm = round(word_count / minutes) if minutes > 0 else 0

    pause_count = 0
    for i in range(1, len(word_timestamps)):
        gap = word_timestamps[i]["start"] - word_timestamps[i - 1]["end"]
        if gap >= _PAUSE_THRESHOLD:
            pause_count += 1

    filler_count = len(_FILLER_RE.findall(transcript))

    return {
        "words_per_minute": wpm,
        "pause_count": pause_count,
        "filler_word_count": filler_count,
    }


async def assess_reading(pdf_text: str, transcript: str, language: str) -> dict:
    """
    Ask the LLM to score accuracy, fluency, and pronunciation.
    overall_score is computed here in Python using the fixed weighted formula —
    the LLM does not touch it.
    """
    lang_name = "Tamil" if language == "tamil" else "English"
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
            "num_ctx": 2048,
            "num_predict": 400,
            "num_thread": 6,
        },
    }

    async with httpx.AsyncClient(timeout=180) as client:
        response = await client.post(f"{settings.OLLAMA_URL}/api/chat", json=payload)
        response.raise_for_status()
        content = response.json()["message"]["content"]
        result = json.loads(content)

    for key in ("accuracy_score", "fluency_score", "pronunciation_score"):
        result[key] = max(0.0, min(100.0, float(result.get(key, 0))))

    # Deterministic weighted formula — never trust the LLM to compute this.
    result["overall_score"] = round(
        result["accuracy_score"] * 0.40
        + result["fluency_score"] * 0.30
        + result["pronunciation_score"] * 0.30,
        1,
    )

    return result
