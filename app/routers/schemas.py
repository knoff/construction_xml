from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from app.db import get_db
from app.models_sqlalchemy import Schema
from app.services import schema_parser
from app.storage import save_file_minio
from datetime import datetime

router = APIRouter(prefix="/schemas", tags=["schemas"])


@router.get("/", response_class=HTMLResponse)
def list_schemas(db: Session = Depends(get_db)):
    schemas = db.query(Schema).all()
    html = "<h2>Загруженные схемы</h2><ul>"
    for s in schemas:
        html += f"<li><a href='/schemas/{s.id}'>{s.name} (версия {s.version or '—'})</a></li>"
    html += "</ul><a href='/schemas/upload'>Загрузить новую схему</a>"
    return html


@router.get("/upload", response_class=HTMLResponse)
def upload_form():
    return """
    <h2>Загрузить XSD</h2>
    <form action="/schemas/upload" method="post" enctype="multipart/form-data">
        <input type="file" name="file" accept=".xsd" required><br><br>
        <button type="submit">Загрузить</button>
    </form>
    """


@router.post("/upload", response_class=HTMLResponse)
async def upload_schema(file: UploadFile, db: Session = Depends(get_db)):
    content = await file.read()
    # сохраняем в MinIO
    object_name = save_file_minio("schemas", file.filename, content)

    # парсим XSD и вытягиваем данные
    info = schema_parser.extract_metadata(content)

    schema = Schema(
        name=info.get("name") or file.filename,
        version=info.get("version"),
        namespace=info.get("namespace"),
        description=info.get("description"),
        file_path=object_name,
        created_at=datetime.utcnow()
    )
    db.add(schema)
    db.commit()
    db.refresh(schema)

    return f"Схема {schema.name} загружена. <a href='/schemas/{schema.id}'>Перейти</a>"


@router.get("/{schema_id}", response_class=HTMLResponse)
def view_schema(schema_id: int, db: Session = Depends(get_db)):
    schema = db.query(Schema).get(schema_id)
    if not schema:
        return "Схема не найдена"
    html = f"""
    <h2>{schema.name}</h2>
    <p><b>Версия:</b> {schema.version or '—'}</p>
    <p><b>Namespace:</b> {schema.namespace or '—'}</p>
    <p><b>Описание:</b> {schema.description or '—'}</p>
    <p><b>Файл в MinIO:</b> {schema.file_path}</p>
    <a href='/schemas'>Назад к списку</a>
    """
    return html
