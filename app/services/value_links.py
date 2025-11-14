"""Services for value link graph operations and lock management."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set

from sqlalchemy import String, asc, cast, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models_sqlalchemy import (
    DocumentRow,
    DocumentVersionRow,
    ObjectRow,
    Schema,
    SchemaType,
    ValueLinkRow,
    ValueLockRow,
)


SCHEMA_VERSION_ESCAPE = "~"


@dataclass
class ParsedKey:
    raw: str
    kind: str  # "document" | "entity"
    path: str
    schema_code: Optional[str] = None
    schema_version: Optional[str] = None
    entity_name: Optional[str] = None


def encode_schema_version(version: str) -> str:
    """Encode schema version for usage inside key path segments."""
    return (version or "").replace(".", SCHEMA_VERSION_ESCAPE)


def decode_schema_version(encoded: str) -> str:
    return (encoded or "").replace(SCHEMA_VERSION_ESCAPE, ".")


def build_schema_key(schema_code: str, schema_version: str, path: str) -> str:
    safe_version = encode_schema_version(schema_version)
    return f"{schema_code}#{safe_version}.{path}" if path else f"{schema_code}#{safe_version}"


def parse_key(raw_key: str) -> ParsedKey:
    if "#" in raw_key:
        head, _, path = raw_key.partition(".")
        schema_part, _, version_part = head.partition("#")
        schema_version = decode_schema_version(version_part)
        return ParsedKey(
            raw=raw_key,
            kind="document",
            schema_code=schema_part,
            schema_version=schema_version,
            path=path,
        )
    if "." in raw_key:
        entity, path = raw_key.split(".", 1)
    else:
        entity, path = raw_key, ""
    return ParsedKey(raw=raw_key, kind="entity", entity_name=entity, path=path)


# ---------------------------------------------------------------------------
# Value links
# ---------------------------------------------------------------------------

def list_value_links(
    db: Session,
    *,
    key: Optional[str] = None,
    relation: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    base_stmt = select(ValueLinkRow)
    if key:
        base_stmt = base_stmt.where(
            or_(ValueLinkRow.left_key == key, ValueLinkRow.right_key == key)
        )
    if relation:
        base_stmt = base_stmt.where(ValueLinkRow.relation == relation)

    total = db.scalar(select(func.count()).select_from(base_stmt.subquery())) or 0
    items = (
        db.execute(
            base_stmt.order_by(asc(ValueLinkRow.id)).offset(offset).limit(limit)
        )
        .scalars()
        .all()
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def create_value_link(
    db: Session,
    *,
    left_key: str,
    right_key: str,
    relation: str = "eq",
    weight: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> ValueLinkRow:
    # Нормализуем порядок ключей, чтобы избежать дублей (A,B) и (B,A)
    if left_key > right_key:
        left_key, right_key = right_key, left_key

    existing = db.scalar(
        select(ValueLinkRow).where(
            ValueLinkRow.left_key == left_key,
            ValueLinkRow.right_key == right_key,
            ValueLinkRow.relation == relation,
        )
    )
    if existing:
        raise IntegrityError("duplicate", params=None, orig=None)

    row = ValueLinkRow(
        left_key=left_key,
        right_key=right_key,
        relation=relation,
        weight=weight,
        meta=meta,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_value_link(db: Session, *, link_id: int) -> bool:
    row = db.get(ValueLinkRow, link_id)
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def _build_adjacency(links: Iterable[ValueLinkRow]) -> Dict[str, Set[str]]:
    adjacency: Dict[str, Set[str]] = {}
    for link in links:
        if link.relation != "eq":
            continue
        adjacency.setdefault(link.left_key, set()).add(link.right_key)
        adjacency.setdefault(link.right_key, set()).add(link.left_key)
    return adjacency


def _collect_component(adjacency: Dict[str, Set[str]], start: str) -> Set[str]:
    visited: Set[str] = set()
    queue: deque[str] = deque([start])
    while queue:
        key = queue.popleft()
        if key in visited:
            continue
        visited.add(key)
        for neighbor in adjacency.get(key, set()):
            if neighbor not in visited:
                queue.append(neighbor)
    return visited


# ---------------------------------------------------------------------------
# Locks
# ---------------------------------------------------------------------------

def list_value_locks(
    db: Session,
    *,
    locked_key: Optional[str] = None,
) -> List[ValueLockRow]:
    stmt = select(ValueLockRow)
    if locked_key:
        stmt = stmt.where(ValueLockRow.locked_key == locked_key)
    return db.execute(stmt.order_by(asc(ValueLockRow.id))).scalars().all()


def upsert_value_lock(
    db: Session,
    *,
    locked_key: str,
    source_key: str,
    mode: str = "sync_on_open",
    comment: Optional[str] = None,
) -> ValueLockRow:
    row = db.scalar(select(ValueLockRow).where(ValueLockRow.locked_key == locked_key))
    if row:
        row.source_key = source_key
        row.mode = mode
        row.comment = comment
    else:
        row = ValueLockRow(
            locked_key=locked_key,
            source_key=source_key,
            mode=mode,
            comment=comment,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_value_lock(db: Session, *, lock_id: int) -> bool:
    row = db.get(ValueLockRow, lock_id)
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Check logic
# ---------------------------------------------------------------------------

def check_value(
    db: Session,
    *,
    key: str,
    value: Any = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    context = context or {}
    parsed_key = parse_key(key)

    links = db.execute(select(ValueLinkRow)).scalars().all()
    adjacency = _build_adjacency(links)
    if key not in adjacency:
        component = {key}
    else:
        component = _collect_component(adjacency, key)

    matches: List[Dict[str, Any]] = []
    for component_key in component:
        matches.extend(
            _collect_matches_for_key(db, component_key, context=context)
        )

    status = _determine_status(value, matches)
    return {
        "status": status,
        "matches": matches,
        "diagnostics": {
            "group_size": len(component),
            "checked_documents": sum(1 for m in matches if m.get("source_type") == "document"),
        },
    }


def _collect_matches_for_key(
    db: Session,
    key: str,
    *,
    context: Dict[str, Any],
) -> List[Dict[str, Any]]:
    parsed = parse_key(key)
    if parsed.kind == "document":
        return _collect_document_matches(db, parsed, context)
    if parsed.kind == "entity":
        return _collect_entity_matches(db, parsed, context)
    return []


def _collect_document_matches(
    db: Session,
    parsed: ParsedKey,
    context: Dict[str, Any],
) -> List[Dict[str, Any]]:
    if not parsed.schema_code or not parsed.schema_version:
        return []
    path_segments = [seg for seg in parsed.path.split(".") if seg]

    stmt = (
        select(
            DocumentRow.doc_uid,
            DocumentRow.object_id,
            DocumentVersionRow.payload,
            DocumentVersionRow.created_at,
            SchemaType.code,
            Schema.version,
        )
        .join(DocumentVersionRow, DocumentVersionRow.document_id == DocumentRow.id)
        .outerjoin(Schema, cast(Schema.id, String) == DocumentRow.schema_id)
        .outerjoin(SchemaType, Schema.type_id == SchemaType.id)
        .where(DocumentVersionRow.is_selected == True)
        .where(SchemaType.code == parsed.schema_code)
        .where(or_(Schema.version == parsed.schema_version, DocumentRow.schema_version == parsed.schema_version))
    )

    object_uid = context.get("object_uid")
    if object_uid:
        stmt = stmt.join(ObjectRow, ObjectRow.id == DocumentRow.object_id)
        stmt = stmt.where(ObjectRow.obj_uid == object_uid)

    document_uid = context.get("document_uid")
    if document_uid:
        stmt = stmt.where(DocumentRow.doc_uid != document_uid)

    rows = db.execute(stmt).all()
    matches: List[Dict[str, Any]] = []
    for row in rows:
        doc_uid, object_id, payload, created_at, schema_code, schema_version = row
        extracted = _extract_value(payload, path_segments)
        if extracted is None:
            continue
        matches.append(
            {
                "key": parsed.raw,
                "value": extracted,
                "source_type": "document",
                "document": {
                    "uid": doc_uid,
                    "object_id": object_id,
                    "schema_code": schema_code,
                    "schema_version": schema_version,
                    "version": {
                        "created_at": created_at,
                    },
                },
            }
        )
    return matches


def _collect_entity_matches(
    db: Session,
    parsed: ParsedKey,
    context: Dict[str, Any],
) -> List[Dict[str, Any]]:
    entity = (parsed.entity_name or "").lower()
    path_segments = [seg for seg in parsed.path.split(".") if seg]
    matches: List[Dict[str, Any]] = []

    if entity == "object":
        object_uid = context.get("object_uid")
        if not object_uid:
            return []
        obj = db.scalar(select(ObjectRow).where(ObjectRow.obj_uid == object_uid))
        if not obj:
            return []
        value = _extract_entity_value(obj, path_segments)
        if value is None:
            return []
        matches.append(
            {
                "key": parsed.raw,
                "value": value,
                "source_type": "entity",
                "entity": {
                    "type": "Object",
                    "id": obj.id,
                    "uid": obj.obj_uid,
                },
            }
        )
    return matches


def _extract_entity_value(entity: Any, path_segments: List[str]) -> Any:
    if not path_segments:
        return None
    current: Any = entity
    for segment in path_segments:
        if hasattr(current, segment):
            current = getattr(current, segment)
        else:
            # Дополнительный alias: Object.Title => ObjectRow.name
            if isinstance(current, ObjectRow) and segment.lower() == "title":
                current = current.name
            else:
                return None
    return current


def _extract_value(payload: Any, path_segments: List[str]) -> Any:
    current = payload
    for segment in path_segments:
        if current is None:
            return None
        if isinstance(current, list):
            if segment.isdigit():
                idx = int(segment)
                if 0 <= idx < len(current):
                    current = current[idx]
                else:
                    return None
            else:
                next_values = []
                for item in current:
                    if isinstance(item, dict) and segment in item:
                        next_values.append(item[segment])
                if not next_values:
                    return None
                current = next_values
        elif isinstance(current, dict):
            current = current.get(segment)
        else:
            return None
    return current


def _determine_status(value: Any, matches: List[Dict[str, Any]]) -> str:
    if not matches:
        return "empty"
    if value is None:
        return "mismatch"
    normalized_value = _normalize(value)
    if all(_normalize(match.get("value")) == normalized_value for match in matches):
        return "matched"
    return "mismatch"


def _normalize(value: Any) -> str:
    if isinstance(value, (dict, list)):
        return str(value)
    return str(value).strip()
