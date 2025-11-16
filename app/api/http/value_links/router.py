from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from app.api.dto.value_links import (
    DocumentContextDTO,
    DocumentFieldStructureResponse,
    EntityContextDTO,
    EntityFieldStructureResponse,
    ValueLinkCheckPayload,
    ValueLinkCheckResponse,
    ValueLinkCreatePayload,
    ValueLinkDTO,
    ValueLinkListResponse,
    ValueLockDTO,
    ValueLockUpsertPayload,
)
from app.services.domain.value_links import ValueLinkService

from .dependencies import call_value_link_service, get_value_link_service

router = APIRouter(
    prefix="/api/v1/value-links",
    tags=["Связи значений"],
    responses={
        400: {"description": "Некорректный запрос"},
        404: {"description": "Запись не найдена"},
        409: {"description": "Связь уже существует"},
        502: {"description": "Не удалось загрузить связанные данные"},
        500: {"description": "Ошибка внутреннего сервиса"},
    },
)

locks_router = APIRouter(
    prefix="/api/v1/value-locks",
    tags=["Блокировки значений"],
    responses={
        400: {"description": "Некорректный запрос"},
        404: {"description": "Запись не найдена"},
        500: {"description": "Ошибка внутреннего сервиса"},
    },
)


@router.get(
    "",
    response_model=ValueLinkListResponse,
    summary="Список связей значений",
    description="Возвращает связи значений с поддержкой фильтрации и пагинации.",
)
def list_links(
    key: Optional[str] = Query(None, description="Фильтр по ключу"),
    relation: Optional[str] = Query(None, description="Фильтр по типу связи"),
    limit: int = Query(50, ge=1, le=500, description="Размер страницы"),
    offset: int = Query(0, ge=0, description="Смещение страницы"),
    service: ValueLinkService = Depends(get_value_link_service),
) -> ValueLinkListResponse:
    """Получить список связей значений."""

    def action() -> ValueLinkListResponse:
        result = service.list_links(key=key, relation=relation, limit=limit, offset=offset)
        items = [ValueLinkDTO(**item) for item in result["items"]]
        return ValueLinkListResponse(items=items, total=result["total"], limit=result["limit"], offset=result["offset"])

    return call_value_link_service(action)


@router.post(
    "",
    response_model=ValueLinkDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Создать связь",
    description="Создаёт новую связь между двумя ключами.",
)
def create_link(
    payload: ValueLinkCreatePayload,
    service: ValueLinkService = Depends(get_value_link_service),
) -> ValueLinkDTO:
    """Создать новую связь значений."""

    return call_value_link_service(lambda: ValueLinkDTO(**service.create_link(**payload.model_dump())))


@router.delete(
    "/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить связь",
    description="Удаляет связь по идентификатору.",
)
def delete_link(
    link_id: int,
    service: ValueLinkService = Depends(get_value_link_service),
) -> None:
    """Удалить связь значений."""

    return call_value_link_service(lambda: service.delete_link(link_id))


@router.post(
    "/check",
    response_model=ValueLinkCheckResponse,
    summary="Проверить значение",
    description="Проверяет значение по заданному ключу и возвращает совпадения.",
)
def check_value(
    payload: ValueLinkCheckPayload,
    service: ValueLinkService = Depends(get_value_link_service),
) -> ValueLinkCheckResponse:
    """Проверить значение по ключу."""

    return call_value_link_service(lambda: ValueLinkCheckResponse(**service.check_value(**payload.model_dump())))


@locks_router.get(
    "",
    response_model=List[ValueLockDTO],
    summary="Список блокировок",
    description="Возвращает блокировки для указанного ключа.",
)
def list_locks(
    locked_key: Optional[str] = Query(None, description="Фильтр по заблокированному ключу"),
    service: ValueLinkService = Depends(get_value_link_service),
) -> List[ValueLockDTO]:
    """Получить блокировки значений."""

    def action() -> List[ValueLockDTO]:
        rows = service.list_locks(locked_key=locked_key)
        return [ValueLockDTO(**row) for row in rows]

    return call_value_link_service(action)


@locks_router.post(
    "",
    response_model=ValueLockDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Создать или обновить блокировку",
    description="Создаёт или обновляет блокировку для указанного ключа.",
)
def upsert_lock(
    payload: ValueLockUpsertPayload,
    service: ValueLinkService = Depends(get_value_link_service),
) -> ValueLockDTO:
    """Создать или обновить блокировку."""

    return call_value_link_service(lambda: ValueLockDTO(**service.upsert_lock(**payload.model_dump())))


@locks_router.delete(
    "/{lock_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить блокировку",
    description="Удаляет блокировку по идентификатору.",
)
def delete_lock(
    lock_id: int,
    service: ValueLinkService = Depends(get_value_link_service),
) -> None:
    """Удалить блокировку."""

    return call_value_link_service(lambda: service.delete_lock(lock_id))


@router.get(
    "/contexts/documents",
    response_model=List[DocumentContextDTO],
    summary="Контексты документов",
    description="Возвращает доступные схемы документов для работы со связями.",
)
def list_document_contexts(
    service: ValueLinkService = Depends(get_value_link_service),
) -> List[DocumentContextDTO]:
    """Получить список контекстов документов."""

    def action() -> List[DocumentContextDTO]:
        rows = service.list_document_contexts()
        return [DocumentContextDTO(**row) for row in rows]

    return call_value_link_service(action)


@router.get(
    "/contexts/entities",
    response_model=List[EntityContextDTO],
    summary="Контексты сущностей",
    description="Возвращает поддерживаемые сущности для связей значений.",
)
def list_entity_contexts(
    service: ValueLinkService = Depends(get_value_link_service),
) -> List[EntityContextDTO]:
    """Получить список контекстов сущностей."""

    def action() -> List[EntityContextDTO]:
        rows = service.list_entity_contexts()
        return [EntityContextDTO(**row) for row in rows]

    return call_value_link_service(action)


@router.get(
    "/structures/documents/{schema_id}",
    response_model=DocumentFieldStructureResponse,
    summary="Структура полей документа",
    description="Возвращает структуру полей схемы документа и соответствия.",
)
def get_document_structures(
    schema_id: int,
    query: Optional[str] = Query(None, description="Поисковый запрос"),
    value_types: Optional[List[str]] = Query(None, description="Фильтр типов значений"),
    service: ValueLinkService = Depends(get_value_link_service),
) -> DocumentFieldStructureResponse:
    """Получить структуру полей документа."""

    def action() -> DocumentFieldStructureResponse:
        payload = service.get_document_field_structure(schema_id=schema_id, query=query, value_types=value_types)
        return DocumentFieldStructureResponse(**payload)

    return call_value_link_service(action)


@router.get(
    "/structures/entities/{entity}",
    response_model=EntityFieldStructureResponse,
    summary="Структура полей сущности",
    description="Возвращает структуру полей сущности и соответствия.",
)
def get_entity_structures(
    entity: str,
    query: Optional[str] = Query(None, description="Поисковый запрос"),
    value_types: Optional[List[str]] = Query(None, description="Фильтр типов значений"),
    service: ValueLinkService = Depends(get_value_link_service),
) -> EntityFieldStructureResponse:
    """Получить структуру полей сущности."""

    def action() -> EntityFieldStructureResponse:
        payload = service.get_entity_field_structure(entity=entity, query=query, value_types=value_types)
        return EntityFieldStructureResponse(**payload)

    return call_value_link_service(action)
