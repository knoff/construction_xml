from datetime import datetime
import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import logging
from app.db import get_db
from app.models_sqlalchemy import Schema, SchemaType
from app.services import schema_parser, schema_classifier
from app.storage import save_file_minio, delete_file_minio, load_file_minio
from app.services import xsd_internal
from app.services.xsd_files import detect_file_hints, build_file_bindings


logger = logging.getLogger(__name__)

@asynccontextmanager
async def _schemas_lifespan(app):
    """
    Тихий прогрев internal-model и file-hints для всех XSD-схем,
    чтобы первые запросы не были пустыми/неполными.
    """
    # защита от повторного запуска в одном процессе
    if getattr(app.state, "schemas_warmed", False):
        yield
        return
    try:
        # берём сессию БД так же, как это делает Depends(get_db)
        db_gen = get_db()
        db: Session = next(db_gen)  # type: ignore
        try:
            schemas = db.query(Schema).order_by(Schema.created_at.desc()).all()
            for s in schemas or []:
                try:
                    if not s.file_path:
                        continue
                    content = load_file_minio(s.file_path)
                    if not content:
                        continue
                    # строим internal-model строго тем же способом, как в /{schema_id}/internal-model
                    model = xsd_internal.build_internal_model(content)
                    # прогоняем детектор хинтов — сам результат не сохраняем
                    _ = detect_file_hints({"model": model})
                except Exception as e:
                    logger.warning("Warmup failed for schema %s: %s", getattr(s, "id", None), e)
        finally:
            try:
                # корректно закрываем сессию
                db.close()
            except Exception:
                pass
        app.state.schemas_warmed = True
    except Exception as e:
        logger.warning("Warmup skipped: %s", e)
    finally:
        # обязательно продолжаем запуск приложения
        yield

router = APIRouter(prefix="/schemas", tags=["schemas"], lifespan=_schemas_lifespan)
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "80"))

def _row_to_dict(s: Schema) -> Dict[str, Any]:
    return {
        "id": s.id,
        "name": s.name,
        "version": s.version,
        "namespace": s.namespace,
        "description": s.description,
        "file_path": s.file_path,
        "created_at": s.created_at.isoformat() if getattr(s, "created_at", None) else None,
        "type": {
            "id": s.type.id,
            "code": s.type.code,
            "title": s.type.title,
        } if getattr(s, "type", None) else None,
    }

@router.get("/")
def list_schemas(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    items = db.query(Schema).order_by(Schema.created_at.desc()).all()
    return [_row_to_dict(s) for s in items]

@router.get("/types")
def list_schema_types(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    rows = db.query(SchemaType).order_by(SchemaType.title.asc()).all()
    return [{"id": t.id, "code": t.code, "title": t.title} for t in rows]

@router.post("/upload")
async def upload_schema(file: UploadFile = File(...), db: Session = Depends(get_db)) -> Dict[str, Any]:
    # проверки
    if not (file.filename or "").lower().endswith(".xsd"):
        raise HTTPException(status_code=400, detail="Ожидается файл .xsd")
    content = await file.read()
    if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Файл превышает {MAX_UPLOAD_MB} МБ")

    # сохраняем в MinIO
    key = save_file_minio("schemas", file.filename, content)

    # парсим метаданные из XSD
    info = schema_parser.extract_metadata(content, filename=file.filename)
    matched = schema_classifier.classify(file.filename, content, db=db)

    display_name = info.get("name") or file.filename
    description = info.get("description")
    type_id = None

    if matched:
        st = db.query(SchemaType).filter(SchemaType.code == matched.code).first()
        if st:
            type_id = st.id
            display_name = st.title or display_name
            if st.description:
                description = st.description

    schema = Schema(
        name=display_name,
        version=info.get("version"),
        namespace=info.get("namespace"),
        description=description,
        file_path=key,
        created_at=datetime.utcnow(),
        type_id=type_id,
    )
    db.add(schema)
    db.commit()
    db.refresh(schema)

    return {"saved": True, "schema": _row_to_dict(schema)}


@router.get("/{schema_id}")
def view_schema(schema_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    schema = db.get(Schema, schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Схема не найдена")
    return _row_to_dict(schema)

@router.get("/{schema_id}/internal-model")
def schema_internal_model(schema_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Build internal model for a schema on-the-fly (no DB persistence)."""
    s = db.get(Schema, schema_id)
    if not s:
        raise HTTPException(status_code=404, detail="Схема не найдена")
    if not s.file_path:
        raise HTTPException(status_code=400, detail="У схемы отсутствует файл")
    content = load_file_minio(s.file_path)
    if not content:
        raise HTTPException(status_code=500, detail="Не удалось прочитать XSD из хранилища")
    model = xsd_internal.build_internal_model(content)
    # include a small header with schema meta
    return {
        "schema": _row_to_dict(s),
        "model": model,
    }

class SchemaUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    namespace: Optional[str] = None
    description: Optional[str] = None
    type_id: Optional[int] = None  # null/0 -> снять тип

@router.put("/{schema_id}")
def update_schema(schema_id: int, payload: SchemaUpdate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    s = db.get(Schema, schema_id)
    if not s:
        raise HTTPException(status_code=404, detail="Схема не найдена")
    # type_id
    if payload.type_id is not None:
        if payload.type_id in (0, ):
            s.type_id = None
        else:
            st = db.get(SchemaType, payload.type_id)
            if not st:
                raise HTTPException(status_code=400, detail="Неизвестный type_id")
            s.type_id = st.id
    # текстовые поля
    for fld in ("name", "version", "namespace", "description"):
        val = getattr(payload, fld)
        if val is not None:
            setattr(s, fld, val.strip() if isinstance(val, str) else val)
    db.commit()
    db.refresh(s)
    return _row_to_dict(s)

@router.post("/{schema_id}/delete")
def delete_schema(schema_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    schema = db.get(Schema, schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Схема не найдена")

    # удалить файл в MinIO
    if schema.file_path:
        delete_file_minio(schema.file_path)

    db.delete(schema)
    db.commit()

    return {"deleted": True, "id": schema_id}

@router.get("/{schema_id}/file-hints")
def schema_file_hints(schema_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Возвращает эвристические подсказки по файловым полям для данной XSD-схемы.
    Ничего не пишет в БД; использует тот же internal-model, что и /internal-model.
    """
    s = db.get(Schema, schema_id)
    if not s:
        raise HTTPException(status_code=404, detail="Схема не найдена")
    if not s.file_path:
        raise HTTPException(status_code=400, detail="У схемы отсутствует файл")
    content = load_file_minio(s.file_path)
    if not content:
        raise HTTPException(status_code=500, detail="Не удалось прочитать XSD из хранилища")
    model = xsd_internal.build_internal_model(content)
    return{
        "schema": _row_to_dict(s),
        "hints": detect_file_hints(model)
    }

@router.get("/{schema_id}/file-bindings")
def schema_file_bindings(schema_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Возвращает структуру назначений файловых полей XSD-схемы.
    Ничего не пишет в БД; использует тот же internal-model, что и /internal-model.
    """
    s = db.get(Schema, schema_id)
    if not s:
        raise HTTPException(status_code=404, detail="Схема не найдена")
    if not s.file_path:
        raise HTTPException(status_code=400, detail="У схемы отсутствует файл")
    content = load_file_minio(s.file_path)
    if not content:
        raise HTTPException(status_code=500, detail="Не удалось прочитать XSD из хранилища")
    model = xsd_internal.build_internal_model(content)
    hints = detect_file_hints(model)
    return{
        "schema": _row_to_dict(s),
        "bindings": build_file_bindings(model, hints)
    }