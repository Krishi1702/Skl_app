"""Run with: docker compose exec backend python -m app.db.minio_init"""
from __future__ import annotations

import asyncio
from app.services.storage_service import StorageService


async def main():
    await StorageService.ensure_bucket()
    print(f"MinIO bucket ready.")


if __name__ == "__main__":
    asyncio.run(main())
