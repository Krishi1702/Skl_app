from __future__ import annotations

import io
import tempfile
import os

from app.core.config import settings

_model = None


class WhisperService:

    @classmethod
    def load(cls) -> None:
        global _model
        if _model is None:
            from faster_whisper import WhisperModel
            _model = WhisperModel(
                settings.WHISPER_MODEL_SIZE,
                device=settings.WHISPER_DEVICE,
                compute_type=settings.WHISPER_COMPUTE_TYPE,
            )
            print(f"[Whisper] Model '{settings.WHISPER_MODEL_SIZE}' loaded on {settings.WHISPER_DEVICE}")

    @classmethod
    def is_loaded(cls) -> bool:
        return _model is not None

    @classmethod
    def transcribe(cls, audio_bytes: bytes, language: str = "en") -> dict:
        if _model is None:
            raise RuntimeError("Whisper model not loaded")

        # Write to a temp file (faster-whisper needs a file path)
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            segments, info = _model.transcribe(
                tmp_path,
                language=language,
                word_timestamps=True,
                vad_filter=True,
                vad_parameters={"min_silence_duration_ms": 500},
            )

            words = []
            full_text_parts = []
            for seg in segments:
                full_text_parts.append(seg.text.strip())
                if seg.words:
                    words.extend(
                        {"word": w.word, "start": round(w.start, 2), "end": round(w.end, 2)}
                        for w in seg.words
                    )

            return {
                "transcript": " ".join(full_text_parts),
                "word_timestamps": words,
                "duration": round(info.duration, 2),
                "language_detected": info.language,
            }
        finally:
            os.unlink(tmp_path)   # Audio immediately deleted after transcription
