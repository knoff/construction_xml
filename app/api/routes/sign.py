from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.signatures import verify_detached_signature

router = APIRouter()

@router.post("/sign/verify")
async def verify(file: UploadFile = File(...), sig: UploadFile = File(...)):
    file_bytes = await file.read()
    sig_bytes = await sig.read()
    result = verify_detached_signature(file_bytes, sig_bytes)
    return result