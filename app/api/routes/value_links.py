from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.services import value_links as svc

router = APIRouter(prefix="/value-links", tags=["value-links"])
locks_router = APIRouter(prefix="/value-locks", tags=["value-locks"])


class ValueLinkCreate(BaseModel):
    left_key: str
    right_key: str
    relation: str = "eq"
    weight: Optional[int] = None
    meta: Optional[Dict[str, Any]] = None


class ValueLinkOut(BaseModel):
    id: int
    left_key: str
    right_key: str
    relation: str
    weight: Optional[int]
    meta: Optional[Dict[str, Any]]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ValueLinkListOut(BaseModel):
    items: List[ValueLinkOut]
    total: int
    limit: int
    offset: int


class ValueLinkCheckRequest(BaseModel):
    key: str
    value: Any | None = None
    context: Dict[str, Any] | None = None


class ValueLinkCheckResponse(BaseModel):
    status: str
    matches: List[Dict[str, Any]]


class ValueLockUpsert(BaseModel):
    locked_key: str
    source_key: str
    mode: str = Field(default="sync_on_open")
    comment: Optional[str] = None


class ValueLockOut(BaseModel):
    id: int
    locked_key: str
    source_key: str
    mode: str
    comment: Optional[str]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ValueLinkContext(BaseModel):
    kind: str


class DocumentContext(ValueLinkContext):
    schema_id: int
    schema_name: str
    schema_version: Optional[str] = None
    schema_code: Optional[str] = None
    schema_title: Optional[str] = None
    description: Optional[str] = None
    updated_at: Optional[str] = None
    has_ui_overrides: bool


class EntityContext(ValueLinkContext):
    entity: str
    title: str
    description: Optional[str] = None


class FieldMeta(BaseModel):
    path: str
    path_segments: List[str]
    normalized_path: str
    name: str
    label: str
    label_path: List[str]
    breadcrumb: str
    kind: str
    dtype: Optional[str] = None
    value_type: Optional[str] = None
    is_array: bool
    is_attribute: bool
    is_choice: bool
    ref_type: Optional[str] = None
    min_occurs: Optional[int] = None
    max_occurs: Optional[int] = None
    selectable: bool
    has_children: bool
    children: List["FieldMeta"] = []


class DocumentFieldContext(BaseModel):
    kind: str
    schema_id: int
    schema_code: Optional[str] = None
    schema_title: Optional[str] = None
    schema_name: str
    schema_version: Optional[str] = None
    description: Optional[str] = None


class EntityFieldContext(BaseModel):
    kind: str
    entity: str
    title: str


class DocumentFieldStructureResponse(BaseModel):
    context: DocumentFieldContext
    tree: List[FieldMeta]
    matches: List[FieldMeta]
    available_value_types: List[str]
    query: Optional[str] = None
    value_type_filter: List[str] = []


class EntityFieldStructureResponse(BaseModel):
    context: EntityFieldContext
    tree: List[FieldMeta]
    matches: List[FieldMeta]
    available_value_types: List[str]
    query: Optional[str] = None
    value_type_filter: List[str] = []


def _serialize_value_link(row) -> ValueLinkOut:
    return ValueLinkOut(
        id=row.id,
        left_key=row.left_key,
        right_key=row.right_key,
        relation=row.relation,
        weight=row.weight,
        meta=row.meta,
        created_at=row.created_at.isoformat() if getattr(row, "created_at", None) else None,
        updated_at=row.updated_at.isoformat() if getattr(row, "updated_at", None) else None,
    )


def _serialize_value_lock(row) -> ValueLockOut:
    return ValueLockOut(
        id=row.id,
        locked_key=row.locked_key,
        source_key=row.source_key,
        mode=row.mode,
        comment=row.comment,
        created_at=row.created_at.isoformat() if getattr(row, "created_at", None) else None,
        updated_at=row.updated_at.isoformat() if getattr(row, "updated_at", None) else None,
    )


@router.get("", response_model=ValueLinkListOut)
def list_links(
    key: Optional[str] = None,
    relation: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    result = svc.list_value_links(db, key=key, relation=relation, limit=limit, offset=offset)
    items = [_serialize_value_link(item) for item in result["items"]]
    return ValueLinkListOut(items=items, total=result["total"], limit=result["limit"], offset=result["offset"])


@router.post("", response_model=ValueLinkOut, status_code=status.HTTP_201_CREATED)
def create_link(payload: ValueLinkCreate, db: Session = Depends(get_db)):
    try:
        row = svc.create_value_link(
            db,
            left_key=payload.left_key,
            right_key=payload.right_key,
            relation=payload.relation,
            weight=payload.weight,
            meta=payload.meta,
        )
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Link already exists")
    return _serialize_value_link(row)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(link_id: int, db: Session = Depends(get_db)):
    if not svc.delete_value_link(db, link_id=link_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")


@router.post("/check", response_model=ValueLinkCheckResponse)
def check_value(payload: ValueLinkCheckRequest = Body(...), db: Session = Depends(get_db)):
    result = svc.check_value(db, key=payload.key, value=payload.value, context=payload.context)
    return ValueLinkCheckResponse(**result)


@locks_router.get("", response_model=List[ValueLockOut])
def list_locks(locked_key: Optional[str] = None, db: Session = Depends(get_db)):
    rows = svc.list_value_locks(db, locked_key=locked_key)
    return [_serialize_value_lock(row) for row in rows]


@locks_router.post("", response_model=ValueLockOut, status_code=status.HTTP_201_CREATED)
def upsert_lock(payload: ValueLockUpsert, db: Session = Depends(get_db)):
    row = svc.upsert_value_lock(
        db,
        locked_key=payload.locked_key,
        source_key=payload.source_key,
        mode=payload.mode,
        comment=payload.comment,
    )
    return _serialize_value_lock(row)


@router.get("/contexts/documents", response_model=List[DocumentContext])
def list_document_contexts(db: Session = Depends(get_db)):
    rows = svc.list_document_contexts(db)
    return [
        DocumentContext(
            kind="document",
            schema_id=row["schema_id"],
            schema_name=row["schema_name"],
            schema_version=row.get("schema_version"),
            schema_code=row.get("schema_code"),
            schema_title=row.get("schema_title"),
            description=row.get("description"),
            updated_at=row.get("updated_at").isoformat() if row.get("updated_at") else None,
            has_ui_overrides=row.get("has_ui_overrides", False),
        )
        for row in rows
    ]


@router.get("/contexts/entities", response_model=List[EntityContext])
def list_entity_contexts():
    rows = svc.list_entity_contexts()
    return [
        EntityContext(kind="entity", entity=row["entity"], title=row["title"], description=row.get("description"))
        for row in rows
    ]


@router.get(
    "/structures/documents/{schema_id}",
    response_model=DocumentFieldStructureResponse,
)
def get_document_field_structure(
    schema_id: int,
    query: Optional[str] = None,
    value_types: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
):
    try:
        payload = svc.get_document_field_structure(
            db,
            schema_id=schema_id,
            query=query,
            value_types=value_types,
        )
    except ValueError as exc:
        code = str(exc)
        if code == "schema_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Схема не найдена")
        if code == "schema_file_missing":
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Не удалось загрузить схему")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный запрос")
    return DocumentFieldStructureResponse(**payload)


@router.get(
    "/structures/entities/{entity}",
    response_model=EntityFieldStructureResponse,
)
def get_entity_field_structure(
    entity: str,
    query: Optional[str] = None,
    value_types: Optional[List[str]] = Query(None),
):
    try:
        payload = svc.get_entity_field_structure(
            entity=entity,
            query=query,
            value_types=value_types,
        )
    except ValueError as exc:
        code = str(exc)
        if code == "entity_not_supported":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Неизвестная сущность")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный запрос")
    return EntityFieldStructureResponse(**payload)


@locks_router.delete("/{lock_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lock(lock_id: int, db: Session = Depends(get_db)):
    if not svc.delete_value_lock(db, lock_id=lock_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lock not found")


FieldMeta.model_rebuild()
