from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.dto.document_versions import (
    VersionDTO,
    VersionFreezeResponse,
    VersionListResponse,
    VersionPatchPayload,
    VersionPayload,
    VersionSelectionResponse,
    VersionStatusPayload,
)
from app.services.domain.document_versions import DocumentVersionService

from .dependencies import call_document_version_service, get_document_version_service


router = APIRouter(
    prefix="/api/v1/documents/{document_id}/versions",
    tags=["Версии документов"],
    responses={
        400: {"description": "Некорректный запрос"},
        404: {"description": "Документ или версия не найдены"},
        500: {"description": "Ошибка внутреннего сервиса"},
    },
)


@router.get(
    "",
    response_model=VersionListResponse,
    summary="Перечень версий документа",
    description="Возвращает все версии документа, отсортированные от новых к старым.",
)
def list_versions(
    document_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
) -> VersionListResponse:
    """Получить все версии документа."""

    def action() -> VersionListResponse:
        items = [VersionDTO(**item) for item in service.list_versions(document_id)]
        return VersionListResponse(items=items)

    return call_document_version_service(action)


@router.post(
    "",
    response_model=VersionDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Создать новую версию",
    description="Сохраняет новую версию документа и помечает её выбранной.",
)
def create_version(
    document_id: int,
    payload: VersionPayload,
    service: DocumentVersionService = Depends(get_document_version_service),
) -> VersionDTO:
    """Создать новую версию документа."""

    def action() -> VersionDTO:
        data = service.create_version(document_id, payload.payload)
        return VersionDTO(**data)

    return call_document_version_service(action)


@router.get(
    "/latest",
    response_model=VersionDTO,
    summary="Последняя версия",
    description="Возвращает последнюю созданную версию документа.",
)
def get_latest_version(
    document_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
) -> VersionDTO:
    """Получить последнюю версию документа."""

    return call_document_version_service(lambda: VersionDTO(**service.latest_version(document_id)))


@router.get(
    "/{version_id}",
    response_model=VersionDTO,
    summary="Получить версию документа",
    description="Возвращает подробные данные конкретной версии.",
)
def get_version(
    document_id: int,
    version_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
) -> VersionDTO:
    """Получить версию по идентификатору."""

    return call_document_version_service(lambda: VersionDTO(**service.get_version(document_id, version_id)))


@router.patch(
    "/{version_id}/status",
    response_model=VersionDTO,
    summary="Изменить статус версии",
    description="Переводит версию в статус 'final', выполняя повторную проверку данных.",
)
def update_version_status(
    document_id: int,
    version_id: int,
    payload: VersionStatusPayload,
    service: DocumentVersionService = Depends(get_document_version_service),
) -> VersionDTO:
    """Перевести версию в статус final."""

    return call_document_version_service(
        lambda: VersionDTO(**service.update_status(document_id, version_id, payload.status))
    )


@router.post(
    "/{version_id}/freeze",
    response_model=VersionFreezeResponse,
    summary="Заморозить версию",
    description="Помечает версию как защищённую от изменений.",
)
def freeze_version(
    document_id: int,
    version_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
) -> VersionFreezeResponse:
    """Защитить версию от изменений."""

    return call_document_version_service(
        lambda: VersionFreezeResponse(**service.freeze_version(document_id, version_id))
    )


@router.post(
    "/{version_id}/unfreeze",
    response_model=VersionFreezeResponse,
    summary="Разморозить версию",
    description="Снимает защиту с версии, если она не финальная.",
)
def unfreeze_version(
    document_id: int,
    version_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
) -> VersionFreezeResponse:
    """Снять защиту с версии."""

    return call_document_version_service(
        lambda: VersionFreezeResponse(**service.unfreeze_version(document_id, version_id))
    )


@router.post(
    "/{version_id}/select",
    response_model=VersionSelectionResponse,
    summary="Сделать версию активной",
    description="Отмечает указанную версию как выбранную для редактирования.",
)
def select_version(
    document_id: int,
    version_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
) -> VersionSelectionResponse:
    """Выбрать версию по умолчанию."""

    return call_document_version_service(
        lambda: VersionSelectionResponse(**service.select_version(document_id, version_id))
    )


@router.patch(
    "/{version_id}",
    response_model=VersionDTO,
    summary="Изменить данные версии",
    description="Обновляет содержимое версии, если она не финальная.",
)
def update_version_payload(
    document_id: int,
    version_id: int,
    payload: VersionPatchPayload,
    service: DocumentVersionService = Depends(get_document_version_service),
) -> VersionDTO:
    """Обновить данные версии."""

    return call_document_version_service(
        lambda: VersionDTO(**service.update_payload(document_id, version_id, payload.payload))
    )
