from __future__ import annotations
import re
from typing import Optional
from lxml import etree

XS = "http://www.w3.org/2001/XMLSchema"
NS = {"xs": XS}

def _version_from_filename(filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    m = re.search(r"-([0-9]{2})[-._]([0-9]{2})\.xsd$", filename, flags=re.IGNORECASE)
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    return None

def extract_metadata(content: bytes, *, filename: Optional[str] = None) -> dict:
    """
    Извлекаем базовые метаданные из XSD, устойчиво к «грязным» файлам:
      - name: первый верхнеуровневый xs:element/@name (или любой xs:element)
      - version: xs:attribute[@name='SchemaVersion']/@fixed (или @default),
                 иначе — из имени файла (*-NN-MM.xsd -> NN.MM)
      - namespace: schema/@targetNamespace (если есть)
      - description: ТОЛЬКО первое xs:schema/xs:annotation/xs:documentation (сжатый текст)
    """
    info: dict = {}

    # Терпимый к ошибкам парсер
    parser = etree.XMLParser(recover=True, resolve_entities=False, huge_tree=True)
    try:
        root = etree.fromstring(content, parser=parser)
    except Exception:
        return info

    # namespace (если вдруг есть)
    ns_attr = root.get("targetNamespace")
    if ns_attr:
        info["namespace"] = ns_attr

    # description: только верхнеуровневый <xs:schema><xs:annotation><xs:documentation>[1]
    desc = None
    try:
        doc = root.find("./xs:annotation/xs:documentation", namespaces=NS)
        if doc is not None and doc.text:
            txt = " ".join(doc.text.split())
            if txt:
                desc = txt
    except Exception:
        pass
    if desc:
        info["description"] = desc

    # name: сначала верхнеуровневый element, если нет — любой element
    el = root.find("./xs:element", namespaces=NS)
    if el is None:
        el = root.find(".//xs:element", namespaces=NS)
    if el is not None:
        name_attr = el.get("name")
        if name_attr:
            info["name"] = name_attr

    # version: SchemaVersion/@fixed -> @default -> из имени файла
    ver = None
    attr = root.find(".//xs:attribute[@name='SchemaVersion']", namespaces=NS)
    if attr is not None:
        ver = attr.get("fixed") or attr.get("default")
    if not ver:
        ver = _version_from_filename(filename)
    if ver:
        info["version"] = ver

    return info
