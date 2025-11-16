from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from app.services.domain.sign import SignService

from .dependencies import get_sign_service

legacy_router = APIRouter(
    prefix="/sign",
    tags=["Подписи (устаревшие)"],
    responses={410: {"description": "Маршрут помечен как устаревший"}},
)


@legacy_router.post("/verify")
async def legacy_verify_signature(
    file: UploadFile = File(...),
    sig: UploadFile = File(...),
    service: SignService = Depends(get_sign_service),
):
    file_bytes = await file.read()
    signature_bytes = await sig.read()
    return service.verify_detached_signature(file_bytes, signature_bytes)
