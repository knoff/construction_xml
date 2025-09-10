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
                    parents_of[ref].add((tname, _elem_name(ch)))
            # рекурсивно спускаемся (choice/sequence/all/inline complexType)
            scan_under(tname, ch)

    for tname, tdef in types.items():
        if isinstance(tdef, dict):
            scan_under(tname, tdef)

    # уникализируем и сортируем поля
    for t, flist in file_fields.items():
        file_fields[t] = sorted(set(flist))

    return file_fields, parents_of


def detect_file_hints(internal: Dict[str, Any]) -> List[str]:
    """
    Возвращаем ТОЛЬКО «полные» (root-привязанные) пути:
      Root/..../Field:TypeK/FieldK-1:...:Type1/File:tFile
    Без лишних промежуточных множеств (экономим память/CPU).
    """
    model = internal.get("model") or internal
    types: Types = model.get("types") or {}
    roots: List[Node] = model.get("root") or []

    # 1) базовые связи по типам (только то, что нужно): где в типах есть tFile, и кто родитель каких типов
    file_fields, parents_of = _collect_type_info(types)

    # 2) индексация ссылок от root-элементов на типы (якоря для пришивания)
    #    roots_of[Type] = {"Root/Path:Type", ...}
    from collections import defaultdict
    roots_of: Dict[str, Set[str]] = defaultdict(set)

    def scan_root_path(node: Node, path_prefix: List[str]):
        for ch in _children(node):
            name = _elem_name(ch)
            # choice/sequence/all без имени — просто спускаемся
            next_path = path_prefix + ([name] if name else [])
            ref = _ref_type(ch)
            if ref and ref in types and name:
                roots_of[ref].add(f"{'/'.join(next_path)}:{ref}")
            # Спускаемся дальше независимо от refType — inline-комплекс тоже возможен
            scan_root_path(ch, next_path)

    for r in roots:
        rname = _elem_name(r)
        scan_root_path(r, [rname] if rname else [])

    # 3) разворачиваем пути вверх ТОЛЬКО для типов, где есть tFile, и сразу пришиваем к root-якорям
    memo_type_up: Dict[str, Set[str]] = {}  # кеш для подъёма по родителям

    def expand_up_from_type(tname: str, visited: Set[str]) -> Set[str]:
        if tname in memo_type_up:
            return memo_type_up[tname]

        paths_here: Set[str] = set()
        base_leaves = {f"{tname}/{fname}:tFile" for fname in file_fields.get(tname, [])}
        if not base_leaves:
            memo_type_up[tname] = set()
            return memo_type_up[tname]

        paths_here |= base_leaves

        for (p_type, p_field) in sorted(parents_of.get(tname, set())):
            if p_type in visited:
                continue
            prefixed_once = {f"{p_type}/{p_field}:{leaf}" for leaf in base_leaves}
            upper = _expand_from_parent(p_type, prefixed_once, visited | {p_type})
            paths_here |= upper

        memo_type_up[tname] = paths_here
        return paths_here

    def _expand_from_parent(current_type: str, current_strings: Set[str], visited: Set[str]) -> Set[str]:
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

    # 4) «сидим» только на нужных типах и сразу пришиваем к их root-якорям
    anchored: Set[str] = set()
    for tname in sorted(file_fields.keys()):
        # цепочки вида "T1/F1:...:File:tFile"
        chains = expand_up_from_type(tname, visited=set())
        if not chains:
            continue
        # пришиваем каждую цепочку ко всем якорям её первого типа
        for s in chains:
            head = s.split(":", 1)[0]            # "T1/F1"
            first_type = head.split("/", 1)[0]   # "T1"
            anchors = roots_of.get(first_type, set())
            if not anchors:
                continue
            rest = s.split(":", 1)[1] if ":" in s else ""
            if rest.startswith(first_type + "/"):
                rest = rest[len(first_type) + 1:]
            for root_anchor in anchors:
                anchor_prefix = root_anchor.rsplit(":", 1)[0]  # "RootPath"
                anchored.add(f"{anchor_prefix}:{rest}" if rest else anchor_prefix)

    # 5) Возвращаем ТОЛЬКО полные (root-привязанные) пути
    return sorted(anchored)



# ----------------- ПОСТОБРАБОТКА: строим bindings из списка строк -----------------

def build_file_bindings(internal: Dict[str, Any], occurrences: List[str]) -> List[Dict[str, Any]]:
    """
    Преобразует строки вида:
      - "tProjectDocument/File:tFile"
      - "tParent/Field:tProjectDocument/File:tFile"
      - "Conclusion/Documents/Document:tProjectDocument/File:tFile" (с якорем от root)
    в привязки (bindings) для рендера/связывания.

    Возвращаем список словарей:
      {
        "rootPath": "Conclusion/Documents/Document" | null,
        "typeChain": ["tProjectDocument", "tFile"],
        "fileElement": "File",
        "containerType": "tProjectDocument",
        "mappingHints": {
          "nameKey": "FileName" | "Name" | null,
          "formatKey": "FileFormat" | "Format" | null,
          "checksumKey": "FileChecksum" | "Checksum" | null,
          "relpathKey": "FileRelativePath" | "RelativePath" | null,
          "hasSign": true|false
        },
        "source": "<исходная_строка>"
      }
    """
    model = internal.get("model") or internal
    types: Types = model.get("types") or {}
    type_names: Set[str] = set(types.keys())

    # Аналитический маппинг: ПОЛЯ tFile → Version (fallback к last version из FileRow)
    def _file_mappings() -> List[Dict[str, Any]]:
        """
        Возвращаем список объектов:
          {"field": "<tFile child>", "from": "<file.*>", "mode": "auto|manual", "confidence": float}
        """
        t = types.get("tFile") or {}
        names: List[str] = []
        for ch in t.get("children") or []:
            nm = ch.get("name") or ""
            if nm:
                names.append(nm)
        res: List[Dict[str, Any]] = []
        for fn in names:
            fl = fn.lower()
            if fl in ("filename", "name"):
                # имя версии; если версия не выбрана — можно подсветить file.filename (last version)
                res.append({"field": fn, "from": "version.filename | fallback:file.filename", "mode": "auto", "confidence": 0.98})
            elif fl in ("fileformat", "format"):
                res.append({"field": fn, "from": "version.format | derive(version.filename)", "mode": "auto", "confidence": 0.95})
            elif fl in ("filechecksum", "checksum"):
                # CRC32 версии; fallback к file.crs32 (crc последней версии)
                res.append({"field": fn, "from": "version.crc32 | fallback:file.crs32", "mode": "auto", "confidence": 0.99})
            elif fl in ("filerelativepath", "relativepath"):
                res.append({"field": fn, "from": "version.relative_path", "mode": "auto", "confidence": 0.9})
            elif fl == "signfile":
                res.append({"field": fn, "from": "version.signatures[*]", "mode": "auto", "confidence": 0.9})
            else:
                # неизвестные поля tFile — пока вручную
                res.append({"field": fn, "from": None, "mode": "manual", "confidence": 0.0})
        return res

    file_mappings = _file_mappings()
    def _container_field_names_from_type(tname: str) -> List[str]:
        """Имена полей контейнера (без файлов и подписей), для связывания с основным файлом."""
        names: List[str] = []
        t = types.get(tname) or {}
        for ch in t.get("children") or []:
            if (ch.get("kind") == "element") and (ch.get("refType") in ("tFile", "tSignFile")):
                continue
            if ch.get("kind") == "choice":
                continue
            nm = ch.get("name")
            if nm:
                names.append(nm)
        return sorted(set(names))

    def _guess_container_mappings(field_names: List[str]) -> List[Dict[str, Any]]:
        """
        Маппинг ПОЛЕЙ КОНТЕЙНЕРА (карточка документа) → FileRow.
        Возвращаем список: {"field","from","mode","confidence"}.
        """
        res: List[Dict[str, Any]] = []
        for fn in field_names:
            fl = fn.lower()
            if "changes" in fl:
                res.append({"field": fn, "from": None, "mode": "manual", "confidence": 0.0})
            elif "docname" in fl or (fl.endswith("name") and "doc" in fl):
                res.append({"field": fn, "from": "file.title", "mode": "auto", "confidence": 0.95})
            elif "docnumber" in fl or (fl.endswith("number") and "doc" in fl):
                res.append({"field": fn, "from": "file.doc_number", "mode": "auto", "confidence": 0.95})
            elif "docdate" in fl or (fl.endswith("date") and "doc" in fl):
                res.append({"field": fn, "from": "file.doc_date", "mode": "auto", "confidence": 0.95})
            elif "doctype" in fl or (fl.endswith("type") and "doc" in fl):
                # NB: в модели — поле 'dco_type' (по твоей ремарке)
                res.append({"field": fn, "from": "file.doc_type", "mode": "auto", "confidence": 0.95})
            else:
                res.append({"field": fn, "from": None, "mode": "manual", "confidence": 0.0})
        return res

    def _sibling_file_elements(tname: str) -> List[str]:
        """Имена других файловых полей в том же контейнере (для информации/связок)."""
        names: List[str] = []
        t = types.get(tname) or {}
        for ch in t.get("children") or []:
            if (ch.get("kind") == "element") and (ch.get("refType") == "tFile"):
                nm = ch.get("name") or ""
                if nm:
                    names.append(nm)
        return sorted(set(names))

    bindings: List[Dict[str, Any]] = []

    for s in occurrences:
        tokens = s.split(":")
        if not tokens:
            continue

        # Определяем, есть ли root-якорь:
        # если первый сегмент выглядит не как имя типа (не начинается с 't' или нет в реестре типов),
        # считаем его rootPath.
        rootPath = None
        start_idx = 0
        if len(tokens) > 1:
            first = tokens[0]
            first_head = first.split("/", 1)[0]
            if (not first_head.startswith("t")) or (first_head not in type_names):
                rootPath = first
                start_idx = 1

        # Разбираем цепочку типов/полей до tFile
        fileElement = None
        containerType = None
        chain: List[str] = []

        # Пройдём все колонки, кроме последней: последняя должна быть "tFile"
        # Пример: ["tParent/Field", "tProjectDocument/File", "tFile"]
        # либо без родителей: ["tProjectDocument/File", "tFile"]
        chain_tokens = tokens[start_idx:]
        if not chain_tokens:
            continue
        # последняя обязана быть "tFile"
        if chain_tokens[-1] != "tFile":
            # если вдруг формат иной — пропустим этот элемент
            continue

        # контейнер — последний тип перед tFile; fileElement — его поле
        for j in range(0, len(chain_tokens) - 1):
            part = chain_tokens[j]
            if "/" not in part:
                # ожидали "Type/Field"
                continue
            tname, fld = part.split("/", 1)
            chain.append(tname)
            fileElement = fld  # последний присвоенный станет целевым полем файла
            containerType = tname  # последний присвоенный станет контейнером
        # завершаем тFile в цепочке
        chain.append("tFile")

        # роль файла в контейнере:
        #  - основной: File
        #  - вспомогательный (ИУЛ): IULFile
        role = "main" if (fileElement or "").lower() == "file" else ("iul" if (fileElement or "").lower() == "iulfile" else "other")
        populate_from_this = (role == "main")  # контейнерные поля заполняем только от основного файла

        bindings.append({
            "rootPath": rootPath,
            "typeChain": chain,
            "fileElement": fileElement,
            "containerType": containerType,
            # tFile-поля ↔ Version (fallback: FileRow.last_version)
            "mappings": file_mappings,
            # маппинг полей контейнера строим только для основного файла
            "mappingsContainer": (
                _guess_container_mappings(_container_field_names_from_type(containerType))
                if (populate_from_this and containerType in type_names)
                else []
            ),
            "siblingFileElements": _sibling_file_elements(containerType) if containerType in type_names else [],
            "fileRole": role,                      # "main" | "iul" | "other"
            "populateFromThisFile": populate_from_this,
            "source": s,
        })

    return bindings