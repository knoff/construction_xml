from __future__ import annotations
import re
from typing import Optional
from lxml import etree

XS = "http://www.w3.org/2001/XMLSchema"
NS = {"xs": XS}

def _version_from_filename(filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    # Ищем *-NN-MM.xsd → NN.MM
    m = re.search(r"-([0-9]{2})[-._]([0-9]{2})\.xsd$", filename, flags=re.IGNORECASE)
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    return None

def extract_metadata(content: bytes, *, filename: Optional[str] = None) -> dict:
    """
    Извлекает базовые метаданные из XSD:
      - name: первый верхнеуровневый xs:element/@name
      - version: xs:attribute[@name='SchemaVersion']/@fixed ИЛИ из имени файла (*-NN-MM.xsd)
      - namespace: schema/@targetNamespace (если есть)
      - description: объединённый текст xs:documentation
    """
    info: dict = {}
    try:
        root = etree.XML(content)
    except Exception:
        # невалидный XML — вернём пусто (выше по стеку решим, что с этим делать)
        return info

    # namespace (если есть)
    ns_attr = root.get("targetNamespace")
    if ns_attr:
        info["namespace"] = ns_attr

    # description (все документации)
    docs_txt = []
    for d in root.findall(".//xs:documentation", namespaces=NS):
        if d is not None and d.text:
            t = d.text.strip()
            if t:
                docs_txt.append(t)
    if docs_txt:
        info["description"] = " ".join(docs_txt)

    # имя документа — первый верхнеуровневый элемент
    el = root.find("./xs:element", namespaces=NS)
    if el is None:
        # fallback — любой element в схеме
        el = root.find(".//xs:element", namespaces=NS)
    if el is not None and el.get("name"):
        info["name"] = el.get("name")

    # версия — сначала SchemaVersion/@fixed…
    ver = None
    attr = root.find(".//xs:attribute[@name='SchemaVersion']", namespaces=NS)
    if attr is not None:
        ver = attr.get("fixed") or attr.get("default")
    # …если нет — из имени файла (*-NN-MM.xsd → NN.MM)
    if not ver:
        ver = _version_from_filename(filename)
    if ver:
        info["version"] = ver

    return info
