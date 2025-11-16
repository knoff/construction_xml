from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Set, Tuple

Node = Dict[str, Any]
Types = Dict[str, Node]


def _children(node: Node) -> List[Node]:
    return node.get("children") or []


def _is_element(node: Node) -> bool:
    return node.get("kind") == "element"


def _ref_type(node: Node) -> str:
    ref = node.get("refType")
    return ref if isinstance(ref, str) else ""


def _element_name(node: Node) -> str:
    return node.get("name") or ""


def _collect_type_info(types: Types) -> Tuple[Dict[str, List[str]], Dict[str, Set[Tuple[str, str]]]]:
    """Собрать вспомогательные структуры по типам XSD."""

    file_fields: Dict[str, List[str]] = defaultdict(list)
    parents_of: Dict[str, Set[Tuple[str, str]]] = defaultdict(set)

    def scan_under(type_name: str, node: Node) -> None:
        for child in _children(node):
            if _is_element(child):
                ref = _ref_type(child)
                if ref == "tFile":
                    file_fields[type_name].append(_element_name(child))
                elif ref:
                    parents_of[ref].add((type_name, _element_name(child)))
            scan_under(type_name, child)

    for type_name, type_definition in types.items():
        if isinstance(type_definition, dict):
            scan_under(type_name, type_definition)

    for type_name, field_list in file_fields.items():
        file_fields[type_name] = sorted(set(field_list))

    return file_fields, parents_of


def detect_file_hints(internal: Dict[str, Any]) -> List[str]:
    """Найти цепочки tFile и вернуть их в виде путей для интерфейса."""

    model = internal.get("model") or internal
    types: Types = model.get("types") or {}
    roots: List[Node] = model.get("root") or []

    file_fields, parents_of = _collect_type_info(types)

    from collections import defaultdict

    roots_of: Dict[str, Set[str]] = defaultdict(set)

    def scan_root_path(node: Node, path_prefix: List[str]) -> None:
        for child in _children(node):
            name = _element_name(child)
            next_path = path_prefix + ([name] if name else [])
            ref = _ref_type(child)
            if ref and ref in types and name:
                roots_of[ref].add(f"{'/'.join(next_path)}:{ref}")
            scan_root_path(child, next_path)

    for root in roots:
        root_name = _element_name(root)
        scan_root_path(root, [root_name] if root_name else [])

    memo_type_up: Dict[str, Set[str]] = {}

    def expand_up_from_type(type_name: str, visited: Set[str]) -> Set[str]:
        if type_name in memo_type_up:
            return memo_type_up[type_name]

        paths_here: Set[str] = set()
        base_leaves = {f"{type_name}/{field}:tFile" for field in file_fields.get(type_name, [])}
        if not base_leaves:
            memo_type_up[type_name] = set()
            return memo_type_up[type_name]

        paths_here |= base_leaves

        for parent_type, parent_field in sorted(parents_of.get(type_name, set())):
            if parent_type in visited:
                continue
            prefixed_once = {f"{parent_type}/{parent_field}:{leaf}" for leaf in base_leaves}
            upper = _expand_from_parent(parent_type, prefixed_once, visited | {parent_type})
            paths_here |= upper

        memo_type_up[type_name] = paths_here
        return paths_here

    def _expand_from_parent(current_type: str, current_strings: Set[str], visited: Set[str]) -> Set[str]:
        result = set(current_strings)
        parents = sorted(parents_of.get(current_type, set()))
        if not parents:
            return result
        for parent_type, parent_field in parents:
            if parent_type in visited:
                continue
            prefixed = {f"{parent_type}/{parent_field}:{string}" for string in current_strings}
            higher = _expand_from_parent(parent_type, prefixed, visited | {parent_type})
            result |= higher
        return result

    anchored: Set[str] = set()
    for type_name in sorted(file_fields.keys()):
        chains = expand_up_from_type(type_name, visited=set())
        if not chains:
            continue
        for chain in chains:
            head = chain.split(":", 1)[0]
            first_type = head.split("/", 1)[0]
            anchors = roots_of.get(first_type, set())
            if not anchors:
                continue
            rest = chain.split(":", 1)[1] if ":" in chain else ""
            if rest.startswith(first_type + "/"):
                rest = rest[len(first_type) + 1 :]
            for root_anchor in anchors:
                anchor_prefix = root_anchor.rsplit(":", 1)[0]
                anchored.add(f"{anchor_prefix}:{rest}" if rest else anchor_prefix)

    return sorted(anchored)


def build_file_bindings(internal: Dict[str, Any], occurrences: List[str]) -> List[Dict[str, Any]]:
    """Построить структуру привязок файловых полей для UI."""

    model = internal.get("model") or internal
    types: Types = model.get("types") or {}
    type_names: Set[str] = set(types.keys())

    def _file_mappings() -> List[Dict[str, Any]]:
        t_file = types.get("tFile") or {}
        names: List[str] = []
        for child in t_file.get("children") or []:
            name = child.get("name") or ""
            if name:
                names.append(name)
        mappings: List[Dict[str, Any]] = []
        for field in names:
            lower = field.lower()
            if lower in ("filename", "name"):
                mappings.append(
                    {
                        "field": field,
                        "from": "version.filename | fallback:file.filename",
                        "mode": "auto",
                        "confidence": 0.98,
                    }
                )
            elif lower in ("fileformat", "format"):
                mappings.append(
                    {
                        "field": field,
                        "from": "version.format | derive(version.filename)",
                        "mode": "auto",
                        "confidence": 0.95,
                    }
                )
            elif lower in ("filechecksum", "checksum"):
                mappings.append(
                    {
                        "field": field,
                        "from": "version.crc32 | fallback:file.crs32",
                        "mode": "auto",
                        "confidence": 0.99,
                    }
                )
            elif lower in ("filerelativepath", "relativepath"):
                mappings.append(
                    {
                        "field": field,
                        "from": "version.relative_path",
                        "mode": "auto",
                        "confidence": 0.9,
                    }
                )
            elif lower == "signfile":
                mappings.append(
                    {
                        "field": field,
                        "from": "version.signatures[*]",
                        "mode": "auto",
                        "confidence": 0.9,
                    }
                )
            else:
                mappings.append({"field": field, "from": None, "mode": "manual", "confidence": 0.0})
        return mappings

    file_mappings = _file_mappings()

    def _container_field_names_from_type(type_name: str) -> List[str]:
        names: List[str] = []
        type_def = types.get(type_name) or {}
        for child in type_def.get("children") or []:
            if child.get("kind") == "element" and child.get("refType") in ("tFile", "tSignFile"):
                continue
            if child.get("kind") == "choice":
                continue
            name = child.get("name")
            if name:
                names.append(name)
        return sorted(set(names))

    def _guess_container_mappings(field_names: List[str]) -> List[Dict[str, Any]]:
        mappings: List[Dict[str, Any]] = []
        for field in field_names:
            lower = field.lower()
            if "changes" in lower:
                mappings.append({"field": field, "from": None, "mode": "manual", "confidence": 0.0})
            elif "docname" in lower or (lower.endswith("name") and "doc" in lower):
                mappings.append({"field": field, "from": "file.title", "mode": "auto", "confidence": 0.95})
            elif "docnumber" in lower or (lower.endswith("number") and "doc" in lower):
                mappings.append({"field": field, "from": "file.doc_number", "mode": "auto", "confidence": 0.95})
            elif "docdate" in lower or (lower.endswith("date") and "doc" in lower):
                mappings.append({"field": field, "from": "file.doc_date", "mode": "auto", "confidence": 0.95})
            elif "doctype" in lower or (lower.endswith("type") and "doc" in lower):
                mappings.append({"field": field, "from": "file.doc_type", "mode": "auto", "confidence": 0.95})
            else:
                mappings.append({"field": field, "from": None, "mode": "manual", "confidence": 0.0})
        return mappings

    def _sibling_file_elements(type_name: str) -> List[str]:
        names: List[str] = []
        type_def = types.get(type_name) or {}
        for child in type_def.get("children") or []:
            if child.get("kind") == "element" and child.get("refType") == "tFile":
                name = child.get("name") or ""
                if name:
                    names.append(name)
        return sorted(set(names))

    bindings: List[Dict[str, Any]] = []

    for source in occurrences:
        tokens = source.split(":")
        if not tokens:
            continue

        root_path = None
        start_idx = 0
        if len(tokens) > 1:
            first = tokens[0]
            first_head = first.split("/", 1)[0]
            if (not first_head.startswith("t")) or (first_head not in type_names):
                root_path = first
                start_idx = 1

        file_element = None
        container_type = None
        chain: List[str] = []

        chain_tokens = tokens[start_idx:]
        if not chain_tokens or chain_tokens[-1] != "tFile":
            continue

        for index in range(0, len(chain_tokens) - 1):
            part = chain_tokens[index]
            if "/" not in part:
                continue
            type_name, field_name = part.split("/", 1)
            chain.append(type_name)
            file_element = field_name
            container_type = type_name
        chain.append("tFile")

        role = "main" if (file_element or "").lower() == "file" else (
            "iul" if (file_element or "").lower() == "iulfile" else "other"
        )
        populate_from_this = role == "main"

        bindings.append(
            {
                "rootPath": root_path,
                "typeChain": chain,
                "fileElement": file_element,
                "containerType": container_type,
                "mappings": file_mappings,
                "mappingsContainer": (
                    _guess_container_mappings(_container_field_names_from_type(container_type))
                    if (populate_from_this and container_type in type_names)
                    else []
                ),
                "siblingFileElements": _sibling_file_elements(container_type) if container_type in type_names else [],
                "fileRole": role,
                "populateFromThisFile": populate_from_this,
                "source": source,
            }
        )

    return bindings
