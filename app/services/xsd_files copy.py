from __future__ import annotations
from typing import Any, Dict, List, Set, Tuple
from collections import defaultdict

Node  = Dict[str, Any]
Types = Dict[str, Node]


def _children(n: Node) -> List[Node]:
    return n.get("children") or []


def _is_element(n: Node) -> bool:
    return (n.get("kind") == "element")


def _ref_type(n: Node) -> str:
    r = n.get("refType")
    return r if isinstance(r, str) else ""


def _elem_name(n: Node) -> str:
    return n.get("name") or ""


def _collect_type_info(types: Types) -> Tuple[Dict[str, List[str]], Dict[str, Set[Tuple[str, str]]]]:
    """
    Возвращает:
      - file_fields[type] = [fieldName, ...]  # элементы с refType=='tFile'
      - parents_of[childType] = {(parentType, fieldName), ...}  # где childType встречается как поле
    """
    file_fields: Dict[str, List[str]] = defaultdict(list)
    parents_of: Dict[str, Set[Tuple[str, str]]] = defaultdict(set)

    def scan_under(tname: str, node: Node):
        for ch in _children(node):
            if _is_element(ch):
                ref = _ref_type(ch)
                if ref == "tFile":
                    file_fields[tname].append(_elem_name(ch))
                elif ref:
                    # ref на другой complexType → считаем, что этот тип встречается в родителе tname
                    parents_of[ref].add((tname, _elem_name(ch)))
            # рекурсивно спускаемся (choice/sequence/all/inline complexType)
            scan_under(tname, ch)

    for tname, tdef in types.items():
        if isinstance(tdef, dict):
            scan_under(tname, tdef)

    # уберём дубликаты имён полей, сохраним порядок (лексикографически)
    for t, flist in file_fields.items():
        # уникализируем, но упорядочим стабильно
        uniq = sorted(set(flist))
        file_fields[t] = uniq

    return file_fields, parents_of


def detect_file_hints(internal: Dict[str, Any]) -> List[str]:
    """
    Возвращаем плоский список путей, где встречаются файлы, включая подъём по родителям:
      ["Type/Field:tFile", "Parent/Fld:Type/Field:tFile", "P2/F2:Parent/Fld:Type/Field:tFile", ...]
    Никаких метаданных схемы тут не возвращаем.
    """
    model = internal.get("model") or internal
    types: Types = model.get("types") or {}

    file_fields, parents_of = _collect_type_info(types)

    # кеш развёрнутых путей «от типа вверх»
    memo: Dict[str, Set[str]] = {}

    def expand_up_from_type(tname: str, visited: Set[str]) -> Set[str]:
        """
        Строит ВСЕ над-пути от данного типа вверх по всем родителям.
        Возвращает множество строк вида "Ancestor/Fld:...:tname/Field:tFile" для всех Field∈file_fields[tname],
        включая (если родителей нет) просто "tname/Field:tFile".
        """
        if tname in memo:
            return memo[tname]

        paths_here: Set[str] = set()
        base_leaves = {f"{tname}/{fname}:tFile" for fname in file_fields.get(tname, [])}
        # если в самом типе нет tFile — базовые листья пустые
        if not base_leaves:
            memo[tname] = set()
            return memo[tname]

        # начинаем с базовых (без родителей)
        paths_here |= base_leaves

        # поднимаемся к каждому родителю на 1 уровень
        for (p_type, p_field) in sorted(parents_of.get(tname, set())):
            if p_type in visited:
                continue
            # префиксуем ТОЛЬКО базовые листья текущего типа
            prefixed_once = {f"{p_type}/{p_field}:{leaf}" for leaf in base_leaves}
            # и рекурсивно поднимаем уже по родителям p_type
            upper = _expand_from_parent(p_type, prefixed_once, visited | {p_type})
            paths_here |= upper

        memo[tname] = paths_here
        return paths_here

    def _expand_from_parent(current_type: str, current_strings: Set[str], visited: Set[str]) -> Set[str]:
        """
        Имеем строки, начинающиеся с "current_type/Field:...".
        Префиксуем их всеми родителями current_type, рекурсивно.
        """
        out = set(current_strings)
        parents = sorted(parents_of.get(current_type, set()))
        if not parents:
            return out
        for (pp_type, pp_field) in parents:
            if pp_type in visited:
                continue
            prefixed = {f"{pp_type}/{pp_field}:{s}" for s in current_strings}
            higher = _expand_from_parent(pp_type, prefixed, visited | {pp_type})
            out |= higher
        return out

    # Собираем результаты для всех типов, где есть прямые tFile
    all_paths: Set[str] = set()
    for tname in sorted(file_fields.keys()):
        all_paths |= expand_up_from_type(tname, visited=set())

    # Вернём в стабильном порядке
    return sorted(all_paths)
