from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from app.db import get_db
from app.models_sqlalchemy import DocumentRow, ObjectRow, Schema

router = APIRouter(prefix="/documents", tags=["documents"])

class CreateDocumentIn(BaseModel):
    object_id: int
    schema_id: int
    schema_version: str | None = None

class DocumentOut(BaseModel):
    id: int
    doc_uid: str
    status: str
    object: dict | None
    schema: dict | None
    created_at: datetime | None = None
    updated_at: datetime | None = None

def _pack(doc: DocumentRow, obj: ObjectRow | None, sch: Schema | None) -> DocumentOut:
    return DocumentOut(
        id=doc.id, doc_uid=doc.doc_uid, status=doc.status,
        object=({ "id": obj.id, "name": obj.name } if obj else None),
        schema=({ "id": sch.id, "name": sch.name, "version": sch.version } if sch else None),
        created_at=doc.created_at, updated_at=doc.updated_at
    )

@router.get("/", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    docs = (
        db.query(DocumentRow)
          .options(joinedload(DocumentRow.object_rel), joinedload(DocumentRow.schema_rel))
          .order_by(DocumentRow.id.desc())
          .all()
    )
    return [
        _pack(
            d,
            d.object_rel if getattr(d, "object_rel", None) else None,
            d.schema_rel if getattr(d, "schema_rel", None) else None,
        )
        for d in docs
    ]

@router.post("/", response_model=DocumentOut, status_code=201)
def create_document(body: CreateDocumentIn, db: Session = Depends(get_db)):
    obj = db.get(ObjectRow, body.object_id)
    if not obj: raise HTTPException(400, "unknown object_id")
    sch = db.get(Schema, body.schema_id)
    if not sch: raise HTTPException(400, "unknown schema_id")
    ver = body.schema_version or sch.version
    d = DocumentRow(
        doc_uid=uuid.uuid4().hex, cdm={},
        object_id=obj.id, schema_id=str(sch.id), schema_version=ver,
        status="draft", created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    db.add(d); db.commit(); db.refresh(d)
    return _pack(d, obj, sch)

@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    d = db.get(DocumentRow, doc_id)
    if not d: raise HTTPException(404, "not found")
    obj = db.get(ObjectRow, d.object_id) if d.object_id else None
    sch = db.get(Schema, int(d.schema_id)) if d.schema_id else None
    return _pack(d, obj, sch)

class PatchDocumentIn(BaseModel):
    status: str | None = None
    object_id: int | None = None   # <— NEW: allow re-bind to another object

@router.patch("/{doc_id}", response_model=DocumentOut)
def patch_document(doc_id: int, body: PatchDocumentIn, db: Session = Depends(get_db)):
    d = db.get(DocumentRow, doc_id)
    if not d: raise HTTPException(404, "not found")
    # 1) change status if provided
    if body.status is not None:
        if body.status not in ("draft","final"):
            raise HTTPException(400, "status must be draft|final")
        d.status = body.status
    # 2) rebind to another object if provided
    if body.object_id is not None:
        obj = db.get(ObjectRow, body.object_id)
        if not obj:
            raise HTTPException(400, "unknown object_id")
        d.object_id = obj.id
    d.updated_at = datetime.utcnow()
    db.commit(); db.refresh(d)
    obj = db.get(ObjectRow, d.object_id) if d.object_id else None
    sch = db.get(Schema, int(d.schema_id)) if d.schema_id else None
    return _pack(d, obj, sch)

@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    d = db.get(DocumentRow, doc_id)
    if not d: return
    db.delete(d); db.commit()
