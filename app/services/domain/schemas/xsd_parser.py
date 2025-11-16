from __future__ import annotations

import re
from typing import Optional

from lxml import etree

XS = "http://www.w3.org/2001/XMLSchema"
NS = {"xs": XS}


def _version_from_filename(filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    match = re.search(r"-([0-9]{2})[-._]([0-9]{2})\.xsd$", filename, flags=re.IGNORECASE)
    if not match:
        return None
    return f"{match.group(1)}.{match.group(2)}"


def extract_metadata(content: bytes, *, filename: Optional[str] = None) -> dict:
    """Извлечь базовые метаданные из XSD-файла.

    Возвращаем словарь с ключами:
      - name: имя верхнеуровневого элемента схемы
      - version: версия (из атрибута SchemaVersion или из имени файла)
      - namespace: targetNamespace
      - description: текст из <xs:documentation>
    """

    info: dict = {}

    parser = etree.XMLParser(recover=True, resolve_entities=False, huge_tree=True)
    try:
        root = etree.fromstring(content, parser=parser)
    except Exception:
        return info

    namespace = root.get("targetNamespace")
    if namespace:
        info["namespace"] = namespace

    documentation = None
    try:
        doc_node = root.find("./xs:annotation/xs:documentation", namespaces=NS)
        if doc_node is not None and doc_node.text:
            text = " ".join(doc_node.text.split())
            if text:
                documentation = text
    except Exception:
        documentation = None
    if documentation:
        info["description"] = documentation

    element = root.find("./xs:element", namespaces=NS) or root.find(".//xs:element", namespaces=NS)
    if element is not None:
        name_attr = element.get("name")
        if name_attr:
            info["name"] = name_attr

    version = None
    attr = root.find(".//xs:attribute[@name='SchemaVersion']", namespaces=NS)
    if attr is not None:
        version = attr.get("fixed") or attr.get("default")
    if not version:
        version = _version_from_filename(filename)
    if version:
        info["version"] = version

    return info
