import os
import uuid
from typing import Optional
import boto3
from botocore.client import Config

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

def save_file_minio(prefix: str, filename: str, content: bytes) -> str:
    # ключ вида: schemas/<uuid>_<имя>
    key = f"{prefix}/{uuid.uuid4().hex}_{filename}"
    _s3.put_object(Bucket=S3_BUCKET, Key=key, Body=content)
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