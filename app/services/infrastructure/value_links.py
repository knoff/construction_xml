"""Низкоуровневые операции для работы со связями значений."""

from __future__ import annotations

from collections import deque
from copy import deepcopy
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
    """Закодировать версию схемы для использования в ключах."""

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


def list_value_links(
    db: Session,
    *,
    key: Optional[str] = None,
    relation: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    stmt = select(ValueLinkRow)
    if key:
        stmt = stmt.where(or_(ValueLinkRow.left_key == key, ValueLinkRow.right_key == key))
    if relation:
        stmt = stmt.where(ValueLinkRow.relation == relation)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = (
        db.execute(stmt.order_by(asc(ValueLinkRow.id)).offset(offset).limit(limit))
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


def list_document_contexts(db: Session) -> List[Dict[str, Any]]:
    rows = (
        db.query(Schema)
        .outerjoin(SchemaType, Schema.type_id == SchemaType.id)
        .order_by(Schema.name.asc())
        .all()
    )
    contexts: List[Dict[str, Any]] = []
    for schema in rows:
        schema_type = getattr(schema, "type", None)
        contexts.append(
            {
                "kind": "document",
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
    return contexts


def list_entity_contexts() -> List[Dict[str, Any]]:
    return [
        {
            "kind": "entity",
            "entity": "object",
            "title": "Объект",
            "description": "Метаданные объекта строительства",
        }
    ]


def get_document_field_structure(
    db: Session,
    *,
    schema_id: int,
    query: Optional[str] = None,
    value_types: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    schema = db.get(Schema, schema_id)
    if not schema:
        raise ValueError("schema_not_found")
    if not schema.file_path:
        raise ValueError("schema_file_missing")

    from app.storage import load_file_minio
    from app.services.domain.schemas.internal import build_internal_model

    content = load_file_minio(schema.file_path)
    if not content:
        raise ValueError("schema_file_missing")

    internal_model = build_internal_model(content)
    tree, flat_nodes, available_types_set = _build_field_tree(internal_model)

    value_types_list = list(value_types or [])
    matches = _filter_matches(flat_nodes, query=query, value_types=value_types_list)

    context = {
        "kind": "document",
        "schema_id": schema.id,
        "schema_code": getattr(getattr(schema, "type", None), "code", None),
        "schema_title": getattr(getattr(schema, "type", None), "title", None),
        "schema_name": schema.name,
        "schema_version": schema.version,
        "description": schema.description,
    }

    available_value_types = sorted(vt for vt in available_types_set if vt)

    return {
        "context": context,
        "tree": tree,
        "matches": matches,
        "available_value_types": available_value_types,
        "query": query,
        "value_type_filter": value_types_list,
    }


def get_entity_field_structure(
    *,
    entity: str,
    query: Optional[str] = None,
    value_types: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    entity = entity.lower()
    if entity != "object":
        raise ValueError("entity_not_supported")

    tree, flat_nodes, available_types_set = _build_entity_field_tree()

    value_types_list = list(value_types or [])
    matches = _filter_matches(flat_nodes, query=query, value_types=value_types_list)

    context = {
        "kind": "entity",
        "entity": entity,
        "title": "Объект",
    }

    available_value_types = sorted(vt for vt in available_types_set if vt)

    return {
        "context": context,
        "tree": tree,
        "matches": matches,
        "available_value_types": available_value_types or ["xs:string"],
        "query": query,
        "value_type_filter": value_types_list,
    }


def _build_field_tree(internal_model: Dict[str, Any]) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], Set[str]]:
    root_fields = internal_model.get("root") or []
    types = internal_model.get("types") or {}
    tree, flat_nodes, value_types = _convert_field_list(
        root_fields,
        types,
        parent_path="",
        parent_labels=(),
        visited_types=None,
    )
    return tree, flat_nodes, value_types


def _build_entity_field_tree() -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], Set[str]]:
    entity_model = [
        {
            "kind": "element",
            "name": "object",
            "dtype": "object",
            "minOccurs": 1,
            "maxOccurs": 1,
            "documentation": {"label": "Объект"},
            "children": [
                {
                    "kind": "element",
                    "name": "id",
                    "dtype": "xs:int",
                    "minOccurs": 1,
                    "maxOccurs": 1,
                    "documentation": {"label": "ID"},
                },
                {
                    "kind": "element",
                    "name": "obj_uid",
                    "dtype": "xs:string",
                    "minOccurs": 1,
                    "maxOccurs": 1,
                    "documentation": {"label": "UID объекта"},
                },
                {
                    "kind": "element",
                    "name": "name",
                    "dtype": "xs:string",
                    "minOccurs": 1,
                    "maxOccurs": 1,
                    "documentation": {"label": "Название"},
                },
                {
                    "kind": "element",
                    "name": "created_at",
                    "dtype": "xs:dateTime",
                    "minOccurs": 0,
                    "maxOccurs": 1,
                    "documentation": {"label": "Создан"},
                },
            ],
            "attributes": [],
        }
    ]

    return _convert_field_list(entity_model, {}, parent_path="", parent_labels=(), visited_types=None)


def _convert_field_list(
    fields: Iterable[Dict[str, Any]],
    types: Dict[str, Any],
    *,
    parent_path: str,
    parent_labels: Iterable[str],
    visited_types: Optional[Set[str]],
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], Set[str]]:
    tree: List[Dict[str, Any]] = []
    flat_nodes: List[Dict[str, Any]] = []
    value_types: Set[str] = set()

    base_visited: Set[str] = set(visited_types or set())

    for field in fields:
        node, node_flat, node_value_types = _convert_single_field(
            field,
            types,
            parent_path,
            tuple(parent_labels),
            set(base_visited),
        )
        tree.append(node)
        flat_nodes.extend(node_flat)
        value_types.update(node_value_types)

    return tree, flat_nodes, value_types


def _convert_single_field(
    field: Dict[str, Any],
    types: Dict[str, Any],
    parent_path: str,
    parent_labels: tuple[str, ...],
    visited_types: Set[str],
) -> tuple[Dict[str, Any], List[Dict[str, Any]], Set[str]]:
    name = field.get("name") or field.get("kind") or "field"
    is_attribute = field.get("kind") == "attribute"
    segment = f"@{name}" if is_attribute and name else name

    if parent_path and segment:
        current_path = f"{parent_path}.{segment}"
    else:
        current_path = segment or parent_path

    ref_type = field.get("refType")
    type_definition = types.get(ref_type) if ref_type else None
    documentation = field.get("documentation") or {}
    if not documentation and isinstance(type_definition, dict):
        type_doc = type_definition.get("documentation")
        if isinstance(type_doc, dict):
            documentation = type_doc

    label = documentation.get("label") or name or field.get("kind") or ""
    current_labels = list(parent_labels)
    if label:
        current_labels.append(label)
    breadcrumb = " / ".join(current_labels)

    child_nodes: List[Dict[str, Any]] = []
    flat_nodes: List[Dict[str, Any]] = []
    value_types: Set[str] = set()

    child_defs = list(field.get("children") or [])
    attribute_defs = list(field.get("attributes") or [])

    if ref_type and isinstance(type_definition, dict) and ref_type not in visited_types:
        visited_with_ref = set(visited_types)
        visited_with_ref.add(ref_type)
        visited_types = visited_with_ref

        if type_definition.get("kind") != "simpleType":
            child_defs.extend(type_definition.get("children") or [])
            attribute_defs.extend(type_definition.get("attributes") or [])

    dtype = field.get("dtype")
    if not dtype and isinstance(type_definition, dict) and type_definition.get("kind") == "simpleType":
        dtype = type_definition.get("base")

    for child_field in child_defs:
        child_node, child_flat, child_types = _convert_single_field(
            child_field,
            types,
            current_path,
            tuple(current_labels),
            set(visited_types),
        )
        child_nodes.append(child_node)
        flat_nodes.extend(child_flat)
        value_types.update(child_types)

    for attr_field in attribute_defs:
        attr_node, attr_flat, attr_types = _convert_single_field(
            attr_field,
            types,
            current_path,
            tuple(current_labels),
            set(visited_types),
        )
        child_nodes.append(attr_node)
        flat_nodes.extend(attr_flat)
        value_types.update(attr_types)

    value_type = dtype if dtype else field.get("refType")
    if value_type:
        value_types.add(value_type)

    node = {
        "path": current_path,
        "path_segments": [seg for seg in current_path.split(".") if seg] if current_path else [],
        "normalized_path": current_path.lower() if current_path else "",
        "name": name,
        "label": label,
        "label_path": current_labels,
        "breadcrumb": breadcrumb,
        "kind": field.get("kind"),
        "dtype": dtype,
        "value_type": value_type,
        "is_array": _is_array(field),
        "is_attribute": is_attribute,
        "is_choice": field.get("kind") == "choice",
        "ref_type": field.get("refType"),
        "min_occurs": field.get("minOccurs"),
        "max_occurs": field.get("maxOccurs"),
        "selectable": _is_selectable(field, child_nodes),
        "has_children": bool(child_nodes),
        "children": child_nodes,
    }

    flat_nodes.insert(0, node)
    return node, flat_nodes, value_types


def _is_array(field: Dict[str, Any]) -> bool:
    max_occurs = field.get("maxOccurs")
    if max_occurs is None:
        return True
    try:
        return int(max_occurs) != 1
    except (TypeError, ValueError):
        return False


def _is_selectable(field: Dict[str, Any], children: List[Dict[str, Any]]) -> bool:
    kind = field.get("kind")
    if kind == "choice":
        return False
    if kind == "element":
        return not children
    if kind == "attribute":
        return True
    return False


def _filter_matches(
    nodes: List[Dict[str, Any]],
    *,
    query: Optional[str],
    value_types: List[str],
) -> List[Dict[str, Any]]:
    normalized_query = query.lower().strip() if query else None
    types_filter = {vt.lower() for vt in value_types if vt}

    def matches_filters(node: Dict[str, Any]) -> bool:
        node_value_type = (node.get("value_type") or "").lower()
        if types_filter and node_value_type not in types_filter:
            return False
        if normalized_query:
            haystack = " ".join(
                [
                    node.get("path") or "",
                    node.get("label") or "",
                    " ".join(node.get("label_path") or []),
                ]
            ).lower()
            if normalized_query not in haystack:
                return False
        return True

    selectable_nodes = [node for node in nodes if node.get("selectable")]

    if not normalized_query and not types_filter:
        # Без фильтров возвращаем все доступные для выбора элементы
        return [deepcopy(node) for node in selectable_nodes]

    results: List[Dict[str, Any]] = []
    for node in selectable_nodes:
        if matches_filters(node):
            results.append(deepcopy(node))

    return results


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
    component = _collect_component(adjacency, key) if key in adjacency else {key}

    matches: List[Dict[str, Any]] = []
    for component_key in component:
        matches.extend(_collect_matches_for_key(db, component_key, context=context))

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
        .where(DocumentVersionRow.is_selected == True)  # noqa: E712
        .where(SchemaType.code == parsed.schema_code)
        .where(
            or_(
                Schema.version == parsed.schema_version,
                DocumentRow.schema_version == parsed.schema_version,
            )
        )
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
        elif isinstance(current, ObjectRow) and segment.lower() == "title":
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
