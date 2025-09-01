from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db import get_db
from app.models_sqlalchemy import ObjectRow, DocumentRow

router = APIRouter(prefix="/objects", tags=["objects"])

class ObjectIn(BaseModel):
    name: str

class ObjectOut(BaseModel):
    id: int
    obj_uid: str
    name: str
    created_at: datetime | None = None

@router.get("/", response_model=list[ObjectOut])
def list_objects(db: Session = Depends(get_db)):
    rows = db.query(ObjectRow).order_by(ObjectRow.id.desc()).all()
    return [ObjectOut(id=r.id, obj_uid=r.obj_uid, name=r.name, created_at=r.created_at) for r in rows]

@router.post("/", response_model=ObjectOut, status_code=201)
def create_object(body: ObjectIn, db: Session = Depends(get_db)):
    if not body.name.strip():
        raise HTTPException(400, "name is required")
    o = ObjectRow(obj_uid=uuid.uuid4().hex, name=body.name.strip(), created_at=datetime.utcnow())
    db.add(o); db.commit(); db.refresh(o)
    return ObjectOut(id=o.id, obj_uid=o.obj_uid, name=o.name, created_at=o.created_at)

@router.get("/{object_id}", response_model=ObjectOut)
def get_object(object_id: int, db: Session = Depends(get_db)):
    o = db.get(ObjectRow, object_id)
    if not o: raise HTTPException(404, "Объект не найден")
    return ObjectOut(id=o.id, obj_uid=o.obj_uid, name=o.name, created_at=o.created_at)

@router.get("/{object_id}/documents/count")
def get_object_docs_count(object_id: int, db: Session = Depends(get_db)):
    o = db.get(ObjectRow, object_id)
    if not o: raise HTTPException(404, "Объект не найден")
    cnt = db.query(DocumentRow).filter(DocumentRow.object_id == object_id).count()
    return {"count": cnt}

@router.patch("/{object_id}", response_model=ObjectOut)
def update_object(object_id: int, body: ObjectIn, db: Session = Depends(get_db)):
    o = db.get(ObjectRow, object_id)
    if not o: raise HTTPException(404, "Объект не найден")
    o.name = body.name.strip()
    db.commit(); db.refresh(o)
    return ObjectOut(id=o.id, obj_uid=o.obj_uid, name=o.name, created_at=o.created_at)

@router.delete("/{object_id}", status_code=204)
def delete_object(object_id: int, db: Session = Depends(get_db), delete_documents: bool = Query(False)):
    o = db.get(ObjectRow, object_id)
    if not o: return
    if delete_documents:
        # remove documents bound to the object explicitly
        db.query(DocumentRow).filter(DocumentRow.object_id == object_id).delete(synchronize_session=False)
    db.delete(o); db.commit()
