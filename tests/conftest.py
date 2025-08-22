import os
import boto3
import pytest
from botocore.client import Config

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event
from app.models_sqlalchemy import SchemaType

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
    connection = engine.connect()
    transaction = connection.begin()

    TestingSessionLocal = sessionmaker(bind=connection, autoflush=False, autocommit=False, future=True)
    session = TestingSessionLocal()

    # стартуем SAVEPOINT поверх внешней транзакции
    nested = session.begin_nested()

    # если код приложения вызвал session.commit(), SAVEPOINT завершится;
    # этот хук пересоздаёт его автоматически, сохраняя изоляцию теста
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, trans):
        nonlocal nested
        if trans.nested and not trans._parent.nested:
            nested = sess.begin_nested()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


# ---- FastAPI TestClient, переопределяем get_db, чтобы он отдавал тестовую сессию ----
@pytest.fixture(scope="function")
def client(db_session, seed_schema_types):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def seed_schema_types(db_session):
    """Гарантирует наличие базовых типов в рамках ТЕКУЩЕЙ тестовой транзакции."""
    base = [
        dict(
            code="design_assignment",
            title="Задание на проектирование",
            description="Схема задания на проектирование (MCS).",
            filename_pattern=r"(?i)DesignAssignment-[0-9]{2}[-_.][0-9]{2}\.xsd",
        ),
        dict(
            code="explanatory_note",
            title="Пояснительная записка",
            description="Схема пояснительной записки (Раздел 1).",
            filename_pattern=r"(?i)ExplanatoryNote-[0-9]{2}[-_.][0-9]{2}\.xsd",
        ),
        dict(
            code="expert_conclusion",
            title="Заключение экспертизы",
            description="Схема заключения экспертизы.",
            filename_pattern=r"(?i)(Expert|Examination)Conclusion-[0-9]{2}[-_.][0-9]{2}\.xsd",
        ),
    ]
    for r in base:
        exists = db_session.query(SchemaType).filter(SchemaType.code == r["code"]).first()
        if not exists:
            db_session.add(SchemaType(**r))
    db_session.flush()
    yield
