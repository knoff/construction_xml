from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db import get_db
from app.models_sqlalchemy import DocumentRow, DocumentVersionRow, Schema  # Schema есть в models_sqlalchemy
from app.services.validate_model import validate_model  # серверная валидация по internal-model
from app.services import xsd_internal  # build_internal_model(content)
from app.storage import load_file_minio  # чтение XSD из MinIO

router = APIRouter(prefix="/documents", tags=["documents"])

class SaveDraftIn(BaseModel):
    payload: dict

class VersionIn(BaseModel):
     payload: dict

class VersionOut(BaseModel):
    id: int
    document_id: int
    payload: dict
    created_at: datetime | None = None
    # new fields for UI clarity
    status: str | None = None          # 'draft' | 'clean' | 'final'
    is_protected: bool | None = None
    is_selected: bool | None = None
    validation: dict | None = None     # {"source":"server","checked_at":ISO,"errors_count":N,"errors":{path:[...]}}

RETAIN_VERSIONS = 20  # could be from settings/env

def get_internal_model_for_document(doc: DocumentRow) -> dict:
    """
    Возвращает internal-model для документа, используя связанную схему:
    1) document.schema_rel → Schema
    2) Schema.file_path → чтение XSD из MinIO
    3) xsd_internal.build_internal_model(content) → dict
    """
    schema: Schema | None = getattr(doc, "schema_rel", None)
    if not schema or not getattr(schema, "file_path", None):
        return {}
    content = load_file_minio(schema.file_path)
    if not content:
        return {}
    return xsd_internal.build_internal_model(content)

@router.post("/{document_id}/versions", response_model=VersionOut, status_code=201)
def save_version(document_id: int, body: SaveDraftIn, db: Session = Depends(get_db)):
    doc = db.get(DocumentRow, document_id)
    if not doc:
        raise HTTPException(404, "Документ не найден")
    # server-side validation using the same internal-model as client
    internal_model = get_internal_model_for_document(doc)
    errs_dict = validate_model(body.payload, internal_model) if internal_model else {}
    errors: list[dict] = [{"path": k, "messages": v} for k, v in errs_dict.items()]
    status = "clean" if not errs_dict else "draft"
    v = DocumentVersionRow(
        document_id=doc.id,
        payload=body.payload,
        created_at=datetime.utcnow(),
        status=status,
        errors={"items": errors} if errors else None,
        errors_count=len(errors),
        is_protected=False,
    )
    try:
        db.query(DocumentVersionRow).filter(
            DocumentVersionRow.document_id == document_id,
            getattr(DocumentVersionRow, "is_selected", False) == True
        ).update({"is_selected": False})
    except Exception:
        # поле может отсутствовать до миграции — просто игнорируем
        pass
    if hasattr(v, "is_selected"):
        v.is_selected = True
    db.add(v)
    # updated_at документа держим актуальным
    doc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(v)
    # retention: keep last N unprotected & non-final
    to_delete = (
        db.query(DocumentVersionRow.id)
          .filter(DocumentVersionRow.document_id == document_id,
                  DocumentVersionRow.is_protected == False,
                  DocumentVersionRow.status != "final")
          .order_by(DocumentVersionRow.id.desc())
          .offset(RETAIN_VERSIONS)
          .all()
    )
    if to_delete:
        ids = [r.id for r in to_delete]
        db.query(DocumentVersionRow).filter(DocumentVersionRow.id.in_(ids)).delete(synchronize_session=False)
        db.commit()
    return VersionOut(
        id=v.id, document_id=v.document_id, payload=v.payload, created_at=v.created_at,
        status=getattr(v, "status", None),
        is_protected=getattr(v, "is_protected", None),
        is_selected=getattr(v, "is_selected", None),
        validation={
            "source": "server",
            "checked_at": datetime.utcnow().isoformat(),
            "errors_count": v.errors_count,
            "errors": errs_dict
        },
    )

@router.get("/{document_id}/versions", response_model=list[VersionOut])
def list_versions(document_id: int, db: Session = Depends(get_db)):
    doc = db.get(DocumentRow, document_id)
    if not doc:
        raise HTTPException(404, "Документ не найден")
    rows = (
        db.query(DocumentVersionRow)
        .filter(DocumentVersionRow.document_id == document_id)
        .order_by(DocumentVersionRow.id.desc())
        .all()
    )
    out = []
    for r in rows:
        out.append(VersionOut(
            id=r.id, document_id=r.document_id, payload=r.payload, created_at=r.created_at,
            status=getattr(r, "status", None),
            is_protected=getattr(r, "is_protected", None),
            is_selected=getattr(r, "is_selected", None),
            validation={
                "source": "server",
                "checked_at": (r.created_at.isoformat() if r.created_at else None),
                "errors_count": getattr(r, "errors_count", None),
                # превратим JSON ошибок из БД в ожидаемый вид {path:[...]}
                "errors": { item["path"]: item["messages"] for item in (getattr(r, "errors", {}) or {}).get("items", []) }
            } if hasattr(r, "errors_count") else None
        ))
    return out

# get one version by id (primary key)
@router.get("/{document_id}/version/{version_id}", response_model=VersionOut)
@router.get("/{document_id}/versions/{version_id}", response_model=VersionOut)
def get_version(document_id: int, version_id: int, db: Session = Depends(get_db)):
    doc = db.get(DocumentRow, document_id)
    if not doc:
        raise HTTPException(404, "Документ не найден")
    v = db.get(DocumentVersionRow, version_id)
    if not v or v.document_id != document_id:
        raise HTTPException(404, "Версия не найдена")
    return VersionOut(id=v.id, document_id=v.document_id, payload=v.payload, created_at=v.created_at)

# latest version helper
@router.get("/{document_id}/versions/latest", response_model=VersionOut)
def latest_version(document_id: int, db: Session = Depends(get_db)):
    doc = db.get(DocumentRow, document_id)
    if not doc:
        raise HTTPException(404, "Документ не найден")
    v = (
        db.query(DocumentVersionRow)
          .filter(DocumentVersionRow.document_id == document_id)
          .order_by(DocumentVersionRow.id.desc())
          .first()
    )
    if not v:
        raise HTTPException(404, "Версии отсутствуют")
    return VersionOut(id=v.id, document_id=v.document_id, payload=v.payload, created_at=v.created_at)

# @router.put("/{document_id}/versions/latest", response_model=VersionOut)
# removed: versions are immutable; create a new one instead

class VersionStatusIn(BaseModel):
    status: str  # only 'final'

@router.patch("/{document_id}/versions/{version_id}/status")
def set_version_status(document_id: int, version_id: int, body: VersionStatusIn, db: Session = Depends(get_db)):
    if body.status != "final":
        raise HTTPException(400, "only transition to 'final' is allowed")
    v = db.get(DocumentVersionRow, version_id)
    if not v or v.document_id != document_id:
        raise HTTPException(404, "Версия не найдена")
    # каноническая проверка перед финализацией
    doc = db.get(DocumentRow, document_id)
    internal_model = get_internal_model_for_document(doc) if doc else {}
    errs_dict = validate_model(v.payload, internal_model) if internal_model else {}
    v.errors = {"items": [{"path": k, "messages": m} for k, m in errs_dict.items()]} if errs_dict else None
    v.errors_count = sum(len(m) for m in errs_dict.values())
    v.status = "clean" if not errs_dict else "draft"
    if v.status != "clean":
        db.commit()
        raise HTTPException(400, "only 'clean' can become 'final'")
    v.status = "final"
    v.is_protected = True
    db.commit()
    return {
        "ok": True, "id": v.id, "status": v.status,
        "validation": {
            "source": "server",
            "checked_at": datetime.utcnow().isoformat(),
            "errors_count": v.errors_count,
            "errors": errs_dict
        }
    }

@router.post("/{document_id}/versions/{version_id}/freeze")
def freeze_version(document_id: int, version_id: int, db: Session = Depends(get_db)):
    v = db.get(DocumentVersionRow, version_id)
    if not v or v.document_id != document_id:
        raise HTTPException(404, "Версия не найдена")
    if v.status != "final":
        v.is_protected = True
        db.commit()
    return {"ok": True, "protected": True}

@router.post("/{document_id}/versions/{version_id}/unfreeze")
def unfreeze_version(document_id: int, version_id: int, db: Session = Depends(get_db)):
    v = db.get(DocumentVersionRow, version_id)
    if not v or v.document_id != document_id:
        raise HTTPException(404, "Версия не найдена")
    if v.status == "final":
        raise HTTPException(400, "final versions cannot be unprotected")
    v.is_protected = False
    db.commit()
    return {"ok": True, "protected": False}

@router.post("/{document_id}/versions/{version_id}/select")
def select_version(document_id: int, version_id: int, db: Session = Depends(get_db)):
    v = db.get(DocumentVersionRow, version_id)
    if not v or v.document_id != document_id:
        raise HTTPException(404, "Версия не найдена")
    # allow selecting clean/final; allow draft too — по договорённости (можно ограничить)
    db.query(DocumentVersionRow).filter(
        DocumentVersionRow.document_id == document_id,
        DocumentVersionRow.is_selected == True
    ).update({"is_selected": False})
    v.is_selected = True
    db.commit()
    return {"ok": True, "selected_version_id": v.id}

class PatchVersionIn(BaseModel):
    payload: dict

@router.patch("/{document_id}/versions/{version_id}", response_model=VersionOut)
def update_version(document_id: int, version_id: int, body: PatchVersionIn, db: Session = Depends(get_db)):
    """Overwrite selected version payload in-place; forbid if final; set status=draft."""
    doc = db.get(DocumentRow, document_id)
    if not doc:
        raise HTTPException(404, "Документ не найден")
    v = db.get(DocumentVersionRow, version_id)
    if not v or v.document_id != document_id:
        raise HTTPException(404, "Версия не найдена")
    # forbid editing finals
    if getattr(v, "status", None) == "final":
        raise HTTPException(400, "final-версию редактировать нельзя")
    # validate new payload on server
    internal_model = get_internal_model_for_document(doc)
    errs_dict = validate_model(body.payload, internal_model) if internal_model else {}
    v.payload = body.payload
    v.errors = {"items": [{"path": k, "messages": m} for k, m in errs_dict.items()]} if errs_dict else None
    v.errors_count = sum(len(m) for m in errs_dict.values())
    v.status = "clean" if not errs_dict else "draft"
    db.commit(); db.refresh(v)
    return VersionOut(
        id=v.id, document_id=v.document_id, payload=v.payload, created_at=v.created_at,
        status=getattr(v, "status", None),
        is_protected=getattr(v, "is_protected", None),
        is_selected=getattr(v, "is_selected", None),
        validation={
            "source": "server",
            "checked_at": datetime.utcnow().isoformat(),
            "errors_count": v.errors_count,
            "errors": errs_dict
        },
    )