from datetime import datetime
import os

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    Request,
    HTTPException,
)
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.db import get_db
from app.models_sqlalchemy import Schema
from app.services import schema_parser
from app.storage import save_file_minio, delete_file_minio


router = APIRouter(prefix="/schemas", tags=["schemas"])
templates = Jinja2Templates(directory="templates")

# делаем доступной функцию now() для шаблонов
templates.env.globals["now"] = datetime.utcnow

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "80"))


@router.get("/", response_class=HTMLResponse)
def list_schemas(request: Request, db: Session = Depends(get_db)):
    items = db.query(Schema).order_by(Schema.created_at.desc()).all()
    flash = request.query_params.get("msg")
    return templates.TemplateResponse(
        "schemas/list.html",
        {"request": request, "items": items, "flash": flash},
    )


@router.get("/upload", response_class=HTMLResponse)
def upload_form(request: Request):
    return templates.TemplateResponse(
        "schemas/upload.html",
        {"request": request, "max_upload_mb": MAX_UPLOAD_MB},
    )


@router.post("/upload", response_class=HTMLResponse)
async def upload_schema(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # проверки
    if not file.filename.lower().endswith(".xsd"):
        raise HTTPException(status_code=400, detail="Ожидается файл .xsd")
    content = await file.read()
    if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Файл превышает {MAX_UPLOAD_MB} МБ")

    # сохраняем в MinIO
    key = save_file_minio("schemas", file.filename, content)

    # парсим метаданные из XSD
    info = schema_parser.extract_metadata(content, filename=file.filename)

    # классифицируем по реестру типов
    from app.services import schema_classifier
    rule = schema_classifier.classify(file.filename, content)

    display_name = info.get("name") or file.filename
    description = info.get("description")
    if rule:
        # приоритет имени/описания — из справочника типов
        display_name = rule.title or display_name
        description = rule.description or description

    schema = Schema(
        name=display_name,
        version=info.get("version"),
        namespace=info.get("namespace"),
        description=description,
        file_path=key,
        created_at=datetime.utcnow(),
    )
    db.add(schema)
    db.commit()
    db.refresh(schema)

    return RedirectResponse(url=f"/schemas/{schema.id}", status_code=303)


@router.get("/{schema_id}", response_class=HTMLResponse)
def view_schema(schema_id: int, request: Request, db: Session = Depends(get_db)):
    schema = db.get(Schema, schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Схема не найдена")
    return templates.TemplateResponse(
        "schemas/view.html",
        {"request": request, "schema": schema},
    )


@router.post("/{schema_id}/delete")
def delete_schema(schema_id: int, request: Request, db: Session = Depends(get_db)):
    schema = db.get(Schema, schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Схема не найдена")

    # удалить файл в MinIO
    if schema.file_path:
        delete_file_minio(schema.file_path)

    db.delete(schema)
    db.commit()

    return RedirectResponse(url="/schemas?msg=Схема%20удалена", status_code=303)
