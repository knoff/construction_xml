from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
from app.models.cdm import Document

router = APIRouter()

# In-memory store for MVP
STORE: Dict[str, Document] = {}

class CreateDocumentRequest(BaseModel):
    id: str
    project_id: str
    project_name: str | None = None

@router.post("/documents")
def create_document(req: CreateDocumentRequest):
    if req.id in STORE:
        raise HTTPException(status_code=400, detail="Document already exists")
    doc = Document(
        id=req.id,
        project={
            "id": req.project_id,
            "name": req.project_name,
            "developer": {},
            "object": {}
        },
        assignment={},
        explanatory={},
    )
    STORE[req.id] = doc
    return doc

@router.get("/documents/{doc_id}")
def get_document(doc_id: str):
    doc = STORE.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc

@router.put("/documents/{doc_id}")
def update_document(doc_id: str, doc: Document):
    if doc_id != doc.id:
        raise HTTPException(status_code=400, detail="Mismatched id")
    STORE[doc_id] = doc
    return doc