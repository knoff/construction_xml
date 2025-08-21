from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.files import save_upload
from app.core.config import settings

router = APIRouter()

@router.post("/files/upload")
async def upload_file(file: UploadFile = File(...)):
    # Size check (streaming size check would be better; here we rely on content length if present)
    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File too large: > {settings.MAX_UPLOAD_MB} MB")
    meta = save_upload(io.BytesIO(content), file.filename)
    return meta

import io  # placed after to satisfy linter for BytesIO usage