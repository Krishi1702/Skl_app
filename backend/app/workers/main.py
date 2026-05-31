"""ARQ worker entry point. Run: python -m app.workers.main"""
from __future__ import annotations

from arq import run_worker
from arq.connections import RedisSettings

from app.core.config import settings
from app.workers.assessment_worker import run_assessment, extract_pdf_text


class WorkerSettings:
    functions = [run_assessment, extract_pdf_text]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 5
    job_timeout = 300  # 5 minutes max per job


if __name__ == "__main__":
    run_worker(WorkerSettings)
