from datetime import datetime
import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models_sqlalchemy import Schema, SchemaType
from app.services import schema_parser, schema_classifier
from app.storage import save_file_minio, delete_file_minio


router = APIRouter(prefix="/schemas", tags=["schemas"])
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
