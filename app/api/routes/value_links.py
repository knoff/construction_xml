from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
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


@locks_router.delete("/{lock_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lock(lock_id: int, db: Session = Depends(get_db)):
    if not svc.delete_value_lock(db, lock_id=lock_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lock not found")
