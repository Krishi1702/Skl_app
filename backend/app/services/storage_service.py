from __future__ import annotations

import aioboto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings

_session = aioboto3.Session()

_internal_url = f"http{'s' if settings.MINIO_SECURE else ''}://{settings.MINIO_ENDPOINT}:{settings.MINIO_PORT}"
_public_url = settings.MINIO_PUBLIC_URL or _internal_url

# Client used for all read/write operations — stays on the internal Docker network
_INTERNAL_KWARGS = dict(
    endpoint_url=_internal_url,
    aws_access_key_id=settings.MINIO_ACCESS_KEY,
    aws_secret_access_key=settings.MINIO_SECRET_KEY,
    region_name="us-east-1",
    config=Config(signature_version="s3v4"),
)

# Client used ONLY for presigned URL generation — signs URLs with the public host
# so the browser can reach them directly.
_PUBLIC_KWARGS = dict(
    endpoint_url=_public_url,
    aws_access_key_id=settings.MINIO_ACCESS_KEY,
    aws_secret_access_key=settings.MINIO_SECRET_KEY,
    region_name="us-east-1",
    config=Config(signature_version="s3v4"),
)


class StorageService:

    @staticmethod
    async def ensure_bucket() -> None:
        async with _session.client("s3", **_INTERNAL_KWARGS) as s3:
            try:
                await s3.head_bucket(Bucket=settings.MINIO_BUCKET_NAME)
            except ClientError:
                await s3.create_bucket(Bucket=settings.MINIO_BUCKET_NAME)
        print(f"[MinIO] Bucket '{settings.MINIO_BUCKET_NAME}' ready.")

    @staticmethod
    async def upload_file(key: str, data: bytes, content_type: str = "application/pdf") -> str:
        async with _session.client("s3", **_INTERNAL_KWARGS) as s3:
            await s3.put_object(
                Bucket=settings.MINIO_BUCKET_NAME,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        return key

    @staticmethod
    async def generate_presigned_url(key: str, expiry_seconds: int = 900) -> str:
        # Sign with the PUBLIC client so the URL uses the browser-accessible host
        async with _session.client("s3", **_PUBLIC_KWARGS) as s3:
            url = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.MINIO_BUCKET_NAME, "Key": key},
                ExpiresIn=expiry_seconds,
            )
        return url

    @staticmethod
    async def delete_file(key: str) -> None:
        async with _session.client("s3", **_INTERNAL_KWARGS) as s3:
            await s3.delete_object(Bucket=settings.MINIO_BUCKET_NAME, Key=key)
