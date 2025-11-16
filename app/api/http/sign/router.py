from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dto.sign import SignatureVerificationResponse
from app.services.domain.sign import SignService

from .dependencies import get_sign_service


router = APIRouter(
    prefix="/api/v1/sign",
    tags=["Подписи"],
)


@router.post(
    "/verify",
    response_model=SignatureVerificationResponse,
    summary="Проверить отсоединённую подпись",
    description="Принимает файл и подпись, выполняет проверку и возвращает результат.",
)
async def verify_signature(
    file: UploadFile = File(..., description="Исходный файл"),
    signature: UploadFile = File(..., description="Отсоединённая подпись"),
    service: SignService = Depends(get_sign_service),
) -> SignatureVerificationResponse:
    """Проверить подпись файла."""

    file_bytes = await file.read()
    signature_bytes = await signature.read()
    result = service.verify_detached_signature(file_bytes, signature_bytes)
    return SignatureVerificationResponse(**result)
