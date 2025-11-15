"""Services for value link graph operations and lock management."""
from __future__ import annotations

import re
from collections import deque
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

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
from app.services import xsd_internal
from app.storage import load_file_minio


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
# Context helpers for mapping UI
# ---------------------------------------------------------------------------


def list_document_contexts(db: Session) -> List[Dict[str, Any]]:
    """Enumerate available document schema contexts for mapping UI."""

    stmt = (
        select(Schema, SchemaType)
        .outerjoin(SchemaType, Schema.type_id == SchemaType.id)
        .order_by(SchemaType.code.nulls_last(), Schema.name.asc(), Schema.version.asc())
    )

    rows: List[Tuple[Schema, Optional[SchemaType]]] = db.execute(stmt).all()  # type: ignore
    results: List[Dict[str, Any]] = []

    for schema, schema_type in rows:
        results.append(
            {
                "schema_id": schema.id,
                "schema_name": schema.name,
                "schema_version": schema.version,
                "schema_code": getattr(schema_type, "code", None),
                "schema_title": getattr(schema_type, "title", None),
                "description": schema.description,
                "updated_at": getattr(schema, "created_at", None),
                "has_ui_overrides": bool(schema.ui_overrides),
            }
        )

    return results


def list_entity_contexts() -> List[Dict[str, Any]]:
    """Return static list of entity contexts supported by value links."""

    # NOTE: пока единственная сущность — Object. Расширяем при появлении новых.
    return [
        {
            "entity": "object",
            "title": "Карточка объекта",
            "description": "Сущность объекта капитального строительства",
        }
    ]


# ---------------------------------------------------------------------------
# Field structure helpers (documents & entities)
# ---------------------------------------------------------------------------


def get_document_field_structure(
    db: Session,
    *,
    schema_id: int,
    query: Optional[str] = None,
    value_types: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    context, tree, flat, available_types = _build_schema_field_tree(db, schema_id=schema_id)
    matches = _filter_flat_fields(flat, query=query, value_types=value_types)
    return {
        "context": context,
        "tree": tree,
        "matches": matches,
        "available_value_types": available_types,
        "query": query or None,
        "value_type_filter": sorted({vt for vt in (value_types or []) if vt}),
    }


def get_entity_field_structure(
    *,
    entity: str,
    query: Optional[str] = None,
    value_types: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    context, tree, flat, available_types = _build_entity_field_tree(entity)
    matches = _filter_flat_fields(flat, query=query, value_types=value_types)
    return {
        "context": context,
        "tree": tree,
        "matches": matches,
        "available_value_types": available_types,
        "query": query or None,
        "value_type_filter": sorted({vt for vt in (value_types or []) if vt}),
    }


def _build_schema_field_tree(
    db: Session,
    *,
    schema_id: int,
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    schema = db.get(Schema, schema_id)
    if not schema:
        raise ValueError("schema_not_found")

    schema_type: Optional[SchemaType] = getattr(schema, "type", None)
    if schema_type is None and getattr(schema, "type_id", None):
        schema_type = db.get(SchemaType, schema.type_id)

    if not schema.file_path:
        raise ValueError("schema_file_missing")

    content = load_file_minio(schema.file_path)
    if not content:
        raise ValueError("schema_file_missing")

    model = xsd_internal.build_internal_model(content)
    types = model.get("types") or {}
    label_overrides = ((schema.ui_overrides or {}).get("labels") or {})

    visited_refs: Set[str] = set()
    tree: List[Dict[str, Any]] = []
    for root in model.get("root") or []:
        if not isinstance(root, dict):
            continue
        name = root.get("name")
        if not name:
            continue
        node = _build_field_node(
            field=root,
            types=types,
            overrides=label_overrides,
            path=[name],
            label_trail=[],
            visited_refs=visited_refs,
        )
        if node:
            tree.append(node)

    flat = _flatten_fields(tree)
    available_types = _collect_available_value_types(flat)
    context = {
        "kind": "document",
        "schema_id": schema.id,
        "schema_code": getattr(schema_type, "code", None),
        "schema_title": getattr(schema_type, "title", None),
        "schema_name": schema.name,
        "schema_version": schema.version,
        "description": schema.description,
    }
    return context, tree, flat, available_types


def _build_entity_field_tree(
    entity: str,
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    entity_key = (entity or "").lower()
    if entity_key == "object":
        tree = _build_object_entity_tree()
        flat = _flatten_fields(tree)
        available_types = _collect_available_value_types(flat)
        context = {
            "kind": "entity",
            "entity": "object",
            "title": "Карточка объекта",
        }
        return context, tree, flat, available_types
    raise ValueError("entity_not_supported")


def _build_object_entity_tree() -> List[Dict[str, Any]]:
    label_trail: List[str] = ["Карточка объекта"]
    return [
        _build_entity_leaf(
            ["id"],
            label="Идентификатор",
            dtype="integer",
            value_type="number",
            label_trail=label_trail,
        ),
        _build_entity_leaf(
            ["obj_uid"],
            label="UID объекта",
            dtype="string",
            value_type="string",
            label_trail=label_trail,
        ),
        _build_entity_leaf(
            ["name"],
            label="Наименование",
            dtype="string",
            value_type="string",
            label_trail=label_trail,
        ),
        _build_entity_leaf(
            ["created_at"],
            label="Дата создания",
            dtype="datetime",
            value_type="datetime",
            label_trail=label_trail,
        ),
    ]


def _build_entity_leaf(
    path_segments: List[str],
    *,
    label: str,
    dtype: str,
    value_type: str,
    label_trail: List[str],
) -> Dict[str, Any]:
    path = ".".join(path_segments)
    normalized = _normalize_path_segments(path_segments)
    label_path = label_trail + [label]
    return {
        "path": path,
        "path_segments": path_segments,
        "normalized_path": normalized,
        "name": path_segments[-1] if path_segments else "",
        "label": label,
        "label_path": label_path,
        "breadcrumb": " / ".join(label_path),
        "kind": "attribute",
        "dtype": dtype,
        "value_type": value_type,
        "is_array": False,
        "is_attribute": True,
        "is_choice": False,
        "ref_type": None,
        "min_occurs": 1,
        "max_occurs": 1,
        "selectable": True,
        "children": [],
        "has_children": False,
    }


def _build_field_node(
    *,
    field: Dict[str, Any],
    types: Dict[str, Any],
    overrides: Dict[str, str],
    path: List[str],
    label_trail: List[str],
    visited_refs: Set[str],
) -> Optional[Dict[str, Any]]:
    expanded, ref_guard = _expand_field(field, types, visited_refs)
    name = expanded.get("name") or ""
    kind = expanded.get("kind")
    if kind not in {"element", "attribute", "choice", "sequence"}:
        if ref_guard:
            visited_refs.discard(ref_guard)
        return None

    path_str = ".".join(path)
    normalized = _normalize_path_segments(path)

    documentation = expanded.get("documentation") or {}
    label = overrides.get(normalized) or documentation.get("label") or _fallback_label(name, kind)
    label_path = [*label_trail, label]

    dtype = expanded.get("dtype")
    value_type = _infer_value_type(expanded)
    is_array = _is_array(expanded)
    is_attribute = kind == "attribute" or (path and path[-1].startswith("@"))
    is_choice = kind == "choice"
    selectable = not is_choice and kind != "sequence"

    node: Dict[str, Any] = {
        "path": path_str,
        "path_segments": list(path),
        "normalized_path": normalized,
        "name": name,
        "label": label,
        "label_path": label_path,
        "breadcrumb": " / ".join(label_path),
        "kind": kind,
        "dtype": dtype,
        "value_type": value_type,
        "is_array": is_array,
        "is_attribute": is_attribute,
        "is_choice": is_choice,
        "ref_type": expanded.get("refType"),
        "min_occurs": expanded.get("minOccurs"),
        "max_occurs": expanded.get("maxOccurs"),
        "selectable": selectable,
        "children": [],
        "has_children": False,
    }

    children: List[Dict[str, Any]] = []
    for child in expanded.get("children") or []:
        if not isinstance(child, dict):
            continue
        child_name = child.get("name")
        if not child_name:
            continue
        child_path = [*path, child_name]
        built = _build_field_node(
            field=child,
            types=types,
            overrides=overrides,
            path=child_path,
            label_trail=label_path,
            visited_refs=visited_refs,
        )
        if built:
            children.append(built)

    for attr in expanded.get("attributes") or []:
        if not isinstance(attr, dict):
            continue
        attr_name = attr.get("name")
        if not attr_name:
            continue
        attr_field = dict(attr)
        attr_field.setdefault("kind", "attribute")
        attr_path = [*path, f"@{attr_name}"]
        built_attr = _build_field_node(
            field=attr_field,
            types=types,
            overrides=overrides,
            path=attr_path,
            label_trail=label_path,
            visited_refs=visited_refs,
        )
        if built_attr:
            built_attr["is_attribute"] = True
            children.append(built_attr)

    node["children"] = children
    node["has_children"] = bool(children)
    if ref_guard:
        visited_refs.discard(ref_guard)
    return node


def _expand_field(
    field: Dict[str, Any],
    types: Dict[str, Any],
    visited_refs: Set[str],
) -> Tuple[Dict[str, Any], Optional[str]]:
    result = dict(field)
    ref = result.get("refType")
    if not (ref and ref in types):
        return result, None
    if ref in visited_refs:
        return result, None

    visited_refs.add(ref)
    type_info = types.get(ref) or {}
    kind = type_info.get("kind")
    if kind == "complexType":
        if not result.get("children") and type_info.get("children"):
            result["children"] = [dict(child) for child in type_info.get("children") or []]
        if not result.get("attributes") and type_info.get("attributes"):
            result["attributes"] = [dict(attr) for attr in type_info.get("attributes") or []]
        if type_info.get("documentation") and not result.get("documentation"):
            result["documentation"] = dict(type_info.get("documentation"))
    elif kind == "simpleType":
        base = type_info.get("base")
        if base:
            result["dtype"] = base
        if type_info.get("facets") and not result.get("facets"):
            result["facets"] = dict(type_info.get("facets"))
        if type_info.get("documentation") and not result.get("documentation"):
            result["documentation"] = dict(type_info.get("documentation"))

    return result, ref


def _flatten_fields(nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    flat: List[Dict[str, Any]] = []

    def walk(items: List[Dict[str, Any]]):
        for node in items:
            current = {k: v for k, v in node.items() if k != "children"}
            current["children"] = []
            flat.append(current)
            if node.get("children"):
                walk(node["children"])

    walk(nodes)
    return flat


def _collect_available_value_types(flat: List[Dict[str, Any]]) -> List[str]:
    types = {node.get("value_type") for node in flat if node.get("value_type")}
    return sorted(types)


def _filter_flat_fields(
    flat: List[Dict[str, Any]],
    *,
    query: Optional[str],
    value_types: Optional[Iterable[str]],
) -> List[Dict[str, Any]]:
    if not flat:
        return []

    value_type_set = {
        (vt or "").lower()
        for vt in (value_types or [])
        if vt
    }
    if not value_type_set:
        value_type_set = None

    terms: Optional[List[str]] = None
    if query:
        terms = [term.casefold() for term in re.split(r"\s+", query.strip()) if term]
        if not terms:
            terms = None

    results: List[Dict[str, Any]] = []
    for node in flat:
        node_value_type = (node.get("value_type") or "").lower()
        if value_type_set is not None and node_value_type not in value_type_set:
            continue
        if terms is not None and not _matches_query_terms(node, terms):
            continue
        if not node.get("selectable", False):
            continue
        results.append(node)
    return results


def _matches_query_terms(node: Dict[str, Any], terms: List[str]) -> bool:
    haystack = " ".join(
        filter(
            None,
            [
                node.get("label"),
                " ".join(node.get("label_path") or []),
                node.get("path"),
                node.get("name"),
                node.get("dtype"),
            ],
        )
    ).casefold()
    return all(term in haystack for term in terms)


def _normalize_path_segments(segments: List[str]) -> str:
    return ".".join("*" if seg.isdigit() else seg for seg in segments)


def _fallback_label(name: str, kind: Optional[str]) -> str:
    if kind == "choice":
        match = re.search(r"#(\d+)", name or "")
        idx = match.group(1) if match else "1"
        return f"Вариант выбора {idx}"
    clean = (name or "").lstrip("@")
    if not clean:
        return "Поле"
    spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", clean)
    spaced = spaced.replace("_", " ").replace("-", " ")
    spaced = re.sub(r"\s+", " ", spaced).strip()
    if not spaced:
        return "Поле"
    return spaced[:1].upper() + spaced[1:]


def _infer_value_type(field: Dict[str, Any]) -> str:
    kind = field.get("kind")
    if kind == "choice":
        return "choice"
    dtype = (field.get("dtype") or "").lower()
    if dtype in {"object", "xs:anyType", "anytype"} or kind in {"sequence"}:
        return "object"
    if "boolean" in dtype:
        return "boolean"
    if re.search(r"(date|time)$", dtype):
        return "datetime"
    if re.search(r"(integer|decimal|float|double|number)$", dtype):
        return "number"
    return "string"


def _is_array(field: Dict[str, Any]) -> bool:
    max_occurs = field.get("maxOccurs")
    if max_occurs is None:
        return True
    try:
        return int(max_occurs) > 1
    except (TypeError, ValueError):
        return False

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
