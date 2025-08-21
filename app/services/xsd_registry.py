from typing import List, Dict, Any
from pathlib import Path

REGISTRY_DIR = Path("data/schemas")
REGISTRY_DIR.mkdir(parents=True, exist_ok=True)

def list_schemas() -> List[Dict[str, Any]]:
    # Stub: list files present in registry
    items = []
    for p in REGISTRY_DIR.glob("**/*"):
        if p.is_file() and p.suffix in {".xsd", ".xsl"}:
            items.append({"path": str(p), "name": p.name})
    return items

def save_schema_file(filename: str, content: bytes) -> Dict[str, Any]:
    path = REGISTRY_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return {"saved": True, "path": str(path)}