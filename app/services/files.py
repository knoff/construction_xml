from pathlib import Path
from typing import Dict, Any
import hashlib, shutil
from app.core.config import settings

def sha256sum(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def save_upload(file_obj, filename: str) -> Dict[str, Any]:
    dest = Path(settings.UPLOAD_DIR) / filename
    with dest.open('wb') as out:
        shutil.copyfileobj(file_obj, out)
    size = dest.stat().st_size
    checksum = sha256sum(dest)
    return {
        "filename": filename,
        "size": size,
        "sha256": checksum,
        "path": str(dest),
    }