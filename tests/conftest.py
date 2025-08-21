import os
import boto3
import pytest
from botocore.client import Config

@pytest.fixture(scope="session", autouse=True)
def ensure_bucket():
    endpoint = os.getenv("S3_ENDPOINT", "http://localhost:19000")
    bucket = os.getenv("S3_BUCKET", "xmlsvc")
    ak = os.getenv("S3_ACCESS_KEY", "minioadmin")
    sk = os.getenv("S3_SECRET_KEY", "minioadmin")

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=ak,
        aws_secret_access_key=sk,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )
    # создать, если нет
    buckets = [b["Name"] for b in s3.list_buckets().get("Buckets", [])]
    if bucket not in buckets:
        s3.create_bucket(Bucket=bucket)
