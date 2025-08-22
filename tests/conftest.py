import os
import boto3
import pytest
from botocore.client import Config

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db import engine, get_db


# ---- S3: гарантируем, что бакет есть (один раз на сессию) ----
@pytest.fixture(scope="session", autouse=True)
def ensure_bucket():
    endpoint = os.getenv("S3_ENDPOINT", "http://localhost:9000")
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


# ---- DB: транзакция на каждый тест, откатываем в конце ----
@pytest.fixture(scope="function")
def db_session():
    """
    Создаёт соединение и внешнюю транзакцию для теста.
    Все изменения откатываются по завершении теста.
    """
    connection = engine.connect()
    transaction = connection.begin()

    TestingSessionLocal = sessionmaker(bind=connection, autoflush=False, autocommit=False, future=True)
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


# ---- FastAPI TestClient, переопределяем get_db, чтобы он отдавал тестовую сессию ----
@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
