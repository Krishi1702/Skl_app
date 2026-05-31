from __future__ import annotations

import json
from uuid import UUID

import redis.asyncio as aioredis

from app.core.config import settings

CHANNEL_PREFIX = "assessment:"


async def publish_assessment_complete(student_id: UUID, session_id: UUID, overall_score: float) -> None:
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        channel = f"{CHANNEL_PREFIX}{student_id}"
        payload = json.dumps({
            "event": "assessment.complete",
            "session_id": str(session_id),
            "overall_score": overall_score,
        })
        await r.publish(channel, payload)
    finally:
        await r.aclose()


async def publish_assessment_failed(student_id: UUID, session_id: UUID, reason: str) -> None:
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        channel = f"{CHANNEL_PREFIX}{student_id}"
        payload = json.dumps({
            "event": "assessment.failed",
            "session_id": str(session_id),
            "reason": reason,
        })
        await r.publish(channel, payload)
    finally:
        await r.aclose()
