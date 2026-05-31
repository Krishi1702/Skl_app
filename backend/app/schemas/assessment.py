from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PronunciationIssue(BaseModel):
    word: str
    issue: str


class GrammaticalMistake(BaseModel):
    original: str
    spoken: str
    type: str


class AssessmentResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    session_id: UUID
    accuracy_score: float
    fluency_score: float
    pronunciation_score: float
    overall_score: float
    words_per_minute: int
    pause_count: int
    filler_word_count: int
    mispronounced_words: list[str]
    pronunciation_issues: list[dict]
    grammatical_mistakes: list[dict]
    strength_tags: list[str]
    weakness_tags: list[str]
    summary_text: str
    assessed_at: datetime


class SessionWithResultOut(BaseModel):
    session: dict
    result: AssessmentResultOut
