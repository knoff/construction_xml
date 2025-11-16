from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, Response, status

from app.api.dto.documents import (
    DocumentCreatePayload,
    DocumentDTO,
    DocumentPatchPayload,
    DocumentWithVersionDTO,
)
from app.services.domain.documents import DocumentService

from .dependencies import call_document_service, get_document_service

legacy_router = APIRouter(
    prefix="/documents",
    tags=["Документы (устаревшие)"],
    responses={410: {"description": "Маршрут помечен как устаревший"}},
)


@legacy_router.get(
    "",
    response_model=list[DocumentDTO],
    summary="[legacy] Получить список документов",
    description="Устаревший маршрут. Используйте GET /api/v1/documents.",
)
def legacy_list_documents(service: DocumentService = Depends(get_document_service)) -> list[DocumentDTO]:
    return call_document_service(lambda: [DocumentDTO(**item) for item in service.list_documents()])


@legacy_router.post(
    "",
    response_model=DocumentDTO,
    status_code=status.HTTP_201_CREATED,
    summary="[legacy] Создать документ",
    description="Устаревший маршрут. Используйте POST /api/v1/documents.",
)
def legacy_create_document(
    payload: DocumentCreatePayload,
    service: DocumentService = Depends(get_document_service),
) -> DocumentDTO:
    return call_document_service(lambda: DocumentDTO(**service.create_document(payload.model_dump())))


@legacy_router.get(
    "/{document_id}",
    response_model=DocumentWithVersionDTO,
    summary="[legacy] Получить документ",
    description="Устаревший маршрут. Используйте GET /api/v1/documents/{document_id}.",
)
def legacy_get_document(document_id: int, service: DocumentService = Depends(get_document_service)) -> DocumentWithVersionDTO:
    return call_document_service(lambda: DocumentWithVersionDTO(**service.get_document(document_id)))


@legacy_router.patch(
    "/{document_id}",
    response_model=DocumentDTO,
    summary="[legacy] Обновить документ",
    description="Устаревший маршрут. Используйте PATCH /api/v1/documents/{document_id}.",
)
def legacy_patch_document(
    document_id: int,
    payload: DocumentPatchPayload,
    service: DocumentService = Depends(get_document_service),
) -> DocumentDTO:
    return call_document_service(
        lambda: DocumentDTO(**service.update_document(document_id, payload.model_dump(exclude_none=True)))
    )


@legacy_router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="[legacy] Удалить документ",
    description="Устаревший маршрут. Используйте DELETE /api/v1/documents/{document_id}.",
)
def legacy_delete_document(document_id: int, service: DocumentService = Depends(get_document_service)) -> Response:
    def action() -> Response:
        service.delete_document(document_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return call_document_service(action)
