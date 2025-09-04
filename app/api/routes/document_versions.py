from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db import get_db
from app.models_sqlalchemy import DocumentRow, DocumentVersionRow

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

@router.post("/{document_id}/versions", response_model=VersionOut, status_code=201)
def save_draft(document_id: int, body: SaveDraftIn, db: Session = Depends(get_db)):
    doc = db.get(DocumentRow, document_id)
    if not doc:
        raise HTTPException(404, "Документ не найден")
    v = DocumentVersionRow(document_id=doc.id, payload=body.payload, created_at=datetime.utcnow())
    db.add(v)
    # updated_at документа держим актуальным
    doc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(v)
    return VersionOut(id=v.id, document_id=v.document_id, payload=v.payload, created_at=v.created_at)

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
    return [VersionOut(id=r.id, document_id=r.document_id, payload=r.payload, created_at=r.created_at) for r in rows]

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

@router.put("/{document_id}/versions/latest", response_model=VersionOut)
def upsert_latest_version(document_id: int, body: VersionIn, db: Session = Depends(get_db)):
    """
    Create first version if none exists; otherwise update payload of the latest version.
    """
    doc = db.get(DocumentRow, document_id)
    if not doc:
        raise HTTPException(404, "Документ не найден")
    v = (db.query(DocumentVersionRow)
           .filter(DocumentVersionRow.document_id == document_id)
           .order_by(DocumentVersionRow.id.desc())
           .first())
    if not v:
        v = DocumentVersionRow(document_id=document_id, payload=body.payload, created_at=datetime.utcnow())
        db.add(v)
        db.commit(); db.refresh(v)
        return VersionOut(id=v.id, document_id=v.document_id, payload=v.payload, created_at=v.created_at)
    # overwrite latest
    v.payload = body.payload
    db.commit(); db.refresh(v)
    return VersionOut(id=v.id, document_id=v.document_id, payload=v.payload, created_at=v.created_at)

class PatchStatusIn(BaseModel):
    status: str

@router.patch("/{document_id}")
def patch_status(document_id: int, body: PatchStatusIn, db: Session = Depends(get_db)):
    if body.status not in ("draft", "final"):
        raise HTTPException(400, "status must be 'draft'|'final'")
    doc = db.get(DocumentRow, document_id)
    if not doc:
        raise HTTPException(404, "Документ не найден")
    doc.status = body.status
    doc.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "id": doc.id, "status": doc.status}
