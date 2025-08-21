from lxml import etree

def extract_metadata(content: bytes) -> dict:
    info = {}
    try:
        root = etree.XML(content)
    except Exception:
        return info

    info["namespace"] = root.get("targetNamespace")
    info["version"] = root.get("version")

    docs = root.findall(".//xs:documentation", namespaces={"xs": "http://www.w3.org/2001/XMLSchema"})
    if docs:
        info["description"] = " ".join([d.text.strip() for d in docs if d is not None and d.text])

    el = root.find(".//xs:element", namespaces={"xs": "http://www.w3.org/2001/XMLSchema"})
    if el is not None:
        info["name"] = el.get("name")

    return info
