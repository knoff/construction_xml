import os
import uuid
from typing import Optional
import boto3
from botocore.client import Config
from urllib.parse import quote as urlquote

S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://minio:9000")
S3_BUCKET = os.getenv("S3_BUCKET", "xmlsvc")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "minioadmin")

_s3 = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)

def _safe_ext(filename: str, fallback: str = "bin") -> str:
    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "").strip()
    return (ext or fallback)[:8]

def save_file_minio(prefix: str, filename: str, content: bytes, content_type: Optional[str]=None) -> str:
    """
    Сохраняем с гарантированно коротким ключом: <prefix>/<uuid>.<ext>
    Игнорируем длинные/опасные имена: берём только расширение (до 8 символов).
    """
    ext = _safe_ext(filename)
    key = f"{prefix}/{uuid.uuid4().hex}.{ext}"
    kwargs = {"Bucket": S3_BUCKET, "Key": key, "Body": content}
    if content_type:
        kwargs["ContentType"] = content_type
    _s3.put_object(**kwargs)
    return key

def save_file_minio_key(key: str, content: bytes, content_type: Optional[str]=None) -> str:
    """
    Сохраняем строго по переданному короткому ключу (когда он уже вычислен, напр. по SHA256).
    """
    # минимальная защита от чрезмерной длины:
    if len(key) > 255:
        raise ValueError(f"KeyTooLongError: {len(key)} > 255")
    kwargs = {"Bucket": S3_BUCKET, "Key": key, "Body": content}
    if content_type:
        kwargs["ContentType"] = content_type
    _s3.put_object(**kwargs)
    return key

def delete_file_minio(key: str) -> None:
    try:
        _s3.delete_object(Bucket=S3_BUCKET, Key=key)
    except Exception:
        # на проде логируем; для MVP — молча
        pass

def presigned_url(key: str, expires: int = 3600) -> Optional[str]:
    try:
        return _s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": key},
            ExpiresIn=expires,
        )
    except Exception:
        return None

def load_file_minio(key: str) -> Optional[bytes]:
    """Load object bytes from MinIO (returns None on any failure)."""
    try:
        resp = _s3.get_object(Bucket=S3_BUCKET, Key=key)
        return resp["Body"].read()
    except Exception:
        return None