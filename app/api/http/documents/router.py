from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.dto.documents import (
    DocumentCreatePayload,
    DocumentDeleteResponse,
    DocumentDTO,
    DocumentListResponse,
    DocumentPatchPayload,
    DocumentWithVersionDTO,
)
from app.services.domain.documents.service import DocumentService

from .dependencies import call_document_service, get_document_service


router = APIRouter(
    prefix="/api/v1/documents",
    tags=["Документы"],
    responses={
        400: {"description": "Некорректный запрос"},
        404: {"description": "Документ не найден"},
        500: {"description": "Ошибка внутреннего сервиса"},
    },
)


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="Получить список документов",
    description="Возвращает документы, отсортированные по дате создания от новых к старым.",
)
def list_documents(service: DocumentService = Depends(get_document_service)) -> DocumentListResponse:
    """Вернуть полный список документов."""

    def action() -> DocumentListResponse:
        items = [DocumentDTO(**item) for item in service.list_documents()]
        return DocumentListResponse(items=items)

    return call_document_service(action)


@router.post(
    "",
    response_model=DocumentDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Создать документ",
    description="Создаёт черновик документа, привязанного к указанному объекту и схеме.",
)
def create_document(
    payload: DocumentCreatePayload,
    service: DocumentService = Depends(get_document_service),
) -> DocumentDTO:
    """Создать новый документ."""

    def action() -> DocumentDTO:
        result = service.create_document(payload.model_dump())
        return DocumentDTO(**result)

    return call_document_service(action)


@router.get(
    "/{document_id}",
    response_model=DocumentWithVersionDTO,
    summary="Получить документ",
    description="Возвращает документ вместе с данными последней версии, если она существует.",
)
def get_document(
    document_id: int,
    service: DocumentService = Depends(get_document_service),
) -> DocumentWithVersionDTO:
    """Получить подробную информацию о документе."""

    def action() -> DocumentWithVersionDTO:
        data = service.get_document(document_id)
        return DocumentWithVersionDTO(**data)

    return call_document_service(action)


@router.patch(
    "/{document_id}",
    response_model=DocumentDTO,
    summary="Обновить документ",
    description="Позволяет изменить статус документа и/или перепривязать его к другому объекту.",
)
def patch_document(
    document_id: int,
    payload: DocumentPatchPayload,
    service: DocumentService = Depends(get_document_service),
) -> DocumentDTO:
    """Частичное обновление документа."""

    def action() -> DocumentDTO:
        data = service.update_document(document_id, payload.model_dump(exclude_none=True))
        return DocumentDTO(**data)

    return call_document_service(action)


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Удалить документ",
    description="Удаляет документ и возвращает подтверждение операции.",
)
def delete_document(
    document_id: int,
    service: DocumentService = Depends(get_document_service),
) -> DocumentDeleteResponse:
    """Удалить документ."""

    def action() -> DocumentDeleteResponse:
        service.delete_document(document_id)
        return DocumentDeleteResponse(deleted=True, id=document_id)

    return call_document_service(action)
