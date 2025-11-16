from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.dto.objects import (
    ObjectCreatePayload,
    ObjectDTO,
    ObjectDeleteResponse,
    ObjectDocumentsCountResponse,
    ObjectListResponse,
    ObjectUpdatePayload,
)
from app.services.domain.objects import ObjectService

from .dependencies import call_object_service, get_object_service


router = APIRouter(
    prefix="/api/v1/objects",
    tags=["Объекты"],
    responses={
        400: {"description": "Некорректный запрос"},
        404: {"description": "Объект не найден"},
        500: {"description": "Ошибка внутреннего сервиса"},
    },
)


@router.get(
    "",
    response_model=ObjectListResponse,
    summary="Список объектов",
    description="Возвращает объекты в порядке от новых к старым.",
)
def list_objects(service: ObjectService = Depends(get_object_service)) -> ObjectListResponse:
    """Получить полный список объектов."""

    def action() -> ObjectListResponse:
        items = [ObjectDTO(**item) for item in service.list_objects()]
        return ObjectListResponse(items=items)

    return call_object_service(action)


@router.post(
    "",
    response_model=ObjectDTO,
    summary="Создать объект",
    description="Создаёт новый объект и присваивает ему уникальный UID.",
)
def create_object(
    payload: ObjectCreatePayload,
    service: ObjectService = Depends(get_object_service),
) -> ObjectDTO:
    """Создать новый объект."""

    return call_object_service(lambda: ObjectDTO(**service.create_object(payload.name)))


@router.get(
    "/{object_id}",
    response_model=ObjectDTO,
    summary="Получить объект",
    description="Возвращает данные объекта по идентификатору.",
)
def get_object(
    object_id: int,
    service: ObjectService = Depends(get_object_service),
) -> ObjectDTO:
    """Получить объект по идентификатору."""

    return call_object_service(lambda: ObjectDTO(**service.get_object(object_id)))


@router.patch(
    "/{object_id}",
    response_model=ObjectDTO,
    summary="Обновить объект",
    description="Обновляет название выбранного объекта.",
)
def update_object(
    object_id: int,
    payload: ObjectUpdatePayload,
    service: ObjectService = Depends(get_object_service),
) -> ObjectDTO:
    """Обновить название объекта."""

    return call_object_service(lambda: ObjectDTO(**service.update_object(object_id, payload.name)))


@router.delete(
    "/{object_id}",
    response_model=ObjectDeleteResponse,
    summary="Удалить объект",
    description="Удаляет объект и, при необходимости, связанные документы.",
)
def delete_object(
    object_id: int,
    delete_documents: bool = Query(
        False,
        description="Удалять ли документы, привязанные к объекту",
    ),
    service: ObjectService = Depends(get_object_service),
) -> ObjectDeleteResponse:
    """Удалить объект и при необходимости связанные документы."""

    return call_object_service(
        lambda: ObjectDeleteResponse(**service.delete_object(object_id, delete_documents))
    )


@router.get(
    "/{object_id}/documents/count",
    response_model=ObjectDocumentsCountResponse,
    summary="Количество документов по объекту",
    description="Возвращает количество документов, привязанных к объекту.",
)
def object_documents_count(
    object_id: int,
    service: ObjectService = Depends(get_object_service),
) -> ObjectDocumentsCountResponse:
    """Получить количество документов у объекта."""

    return call_object_service(lambda: ObjectDocumentsCountResponse(**service.count_documents(object_id)))
