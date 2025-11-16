from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dto.schemas import (
    FileBindingsResponse,
    FileHintsResponse,
    SchemaDTO,
    SchemaDeleteResponse,
    SchemaInternalModelResponse,
    SchemaListResponse,
    SchemaTypeListResponse,
    SchemaUpdatePayload,
    SchemaUploadResponse,
    UiOverridesPayload,
    UiOverridesResponse,
)
from app.services.domain.schemas.service import SchemaService

from .dependencies import call_schema_service, get_schema_service


router = APIRouter(
    prefix="/api/v1/schemas",
    tags=["Схемы"],
    responses={
        400: {"description": "Некорректный запрос"},
        404: {"description": "Схема не найдена"},
        500: {"description": "Ошибка внутреннего сервиса"},
    },
)


@router.get(
    "",
    response_model=SchemaListResponse,
    summary="Перечень загруженных XSD-схем",
    description="Возвращает все схемы, загруженные в систему, в порядке от новых к старым.",
)
def list_schemas(service: SchemaService = Depends(get_schema_service)) -> SchemaListResponse:
    """Получить перечень всех схем."""

    return call_schema_service(lambda: SchemaListResponse(items=service.list_schemas()))


@router.get(
    "/types",
    response_model=SchemaTypeListResponse,
    summary="Справочник типов схем",
    description="Возвращает упорядоченный по названию список доступных типов схем.",
)
def list_schema_types(service: SchemaService = Depends(get_schema_service)) -> SchemaTypeListResponse:
    """Получить список типов схем."""

    return call_schema_service(lambda: SchemaTypeListResponse(items=service.list_schema_types()))


@router.post(
    "/upload",
    response_model=SchemaUploadResponse,
    summary="Загрузить новую XSD-схему",
    description="Принимает файл XSD, сохраняет его во внешнее хранилище и создаёт запись о схеме.",
)
async def upload_schema(
    file: UploadFile = File(..., description="Файл XSD для загрузки"),
    service: SchemaService = Depends(get_schema_service),
) -> SchemaUploadResponse:
    """Загрузить новую схему."""

    content = await file.read()
    filename = file.filename or "uploaded.xsd"
    return call_schema_service(lambda: SchemaUploadResponse(**service.upload_schema(filename=filename, content=content)))


@router.get(
    "/{schema_id}",
    response_model=SchemaDTO,
    summary="Получить информацию о схеме",
    description="Возвращает детальную информацию о выбранной схеме.",
)
def get_schema(
    schema_id: int,
    service: SchemaService = Depends(get_schema_service),
) -> SchemaDTO:
    """Вернуть описание схемы по идентификатору."""

    return call_schema_service(lambda: SchemaDTO(**service.get_schema(schema_id)))


@router.patch(
    "/{schema_id}",
    response_model=SchemaDTO,
    summary="Изменить свойства схемы",
    description="Позволяет обновить название, описание, версию или привязанный тип схемы.",
)
def update_schema(
    schema_id: int,
    payload: SchemaUpdatePayload,
    service: SchemaService = Depends(get_schema_service),
) -> SchemaDTO:
    """Частично обновить поля схемы."""

    return call_schema_service(lambda: SchemaDTO(**service.update_schema(schema_id, payload.model_dump(exclude_none=True))))


@router.delete(
    "/{schema_id}",
    response_model=SchemaDeleteResponse,
    summary="Удалить схему",
    description="Удаляет схему и связанные с ней ресурсы во внешнем хранилище.",
)
def delete_schema(
    schema_id: int,
    service: SchemaService = Depends(get_schema_service),
) -> SchemaDeleteResponse:
    """Удалить схему из системы."""

    return call_schema_service(lambda: SchemaDeleteResponse(**service.delete_schema(schema_id)))


@router.get(
    "/{schema_id}/internal-model",
    response_model=SchemaInternalModelResponse,
    summary="Построить внутреннюю модель схемы",
    description="Возвращает внутреннее представление XSD-схемы вместе с сохранёнными UI-настройками.",
)
def schema_internal_model(
    schema_id: int,
    service: SchemaService = Depends(get_schema_service),
) -> SchemaInternalModelResponse:
    """Получить внутреннюю модель схемы."""

    return call_schema_service(lambda: SchemaInternalModelResponse(**service.get_internal_model(schema_id)))


@router.get(
    "/{schema_id}/ui-overrides",
    response_model=UiOverridesResponse,
    summary="Получить UI-настройки схемы",
    description="Возвращает сохранённые UI-настройки для выбранной схемы.",
)
def get_ui_overrides(
    schema_id: int,
    service: SchemaService = Depends(get_schema_service),
) -> UiOverridesResponse:
    """Получить UI-настройки схемы."""

    return call_schema_service(lambda: UiOverridesResponse(**service.get_ui_overrides(schema_id)))


@router.put(
    "/{schema_id}/ui-overrides",
    response_model=UiOverridesResponse,
    summary="Сохранить UI-настройки схемы",
    description="Сохраняет переданный словарь настроек пользовательского интерфейса для схемы.",
)
def put_ui_overrides(
    schema_id: int,
    payload: UiOverridesPayload,
    service: SchemaService = Depends(get_schema_service),
) -> UiOverridesResponse:
    """Обновить UI-настройки схемы."""

    return call_schema_service(lambda: UiOverridesResponse(**service.update_ui_overrides(schema_id, payload.ui_overrides)))


@router.get(
    "/{schema_id}/file-hints",
    response_model=FileHintsResponse,
    summary="Получить подсказки по файловым полям",
    description="Строит эвристические подсказки по файловым полям XSD-схемы.",
)
def schema_file_hints(
    schema_id: int,
    service: SchemaService = Depends(get_schema_service),
) -> FileHintsResponse:
    """Получить подсказки по файловым полям."""

    return call_schema_service(lambda: FileHintsResponse(**service.get_file_hints(schema_id)))


@router.get(
    "/{schema_id}/file-bindings",
    response_model=FileBindingsResponse,
    summary="Получить привязки файловых полей",
    description="Возвращает структурированные привязки файловых полей для XSD-схемы.",
)
def schema_file_bindings(
    schema_id: int,
    service: SchemaService = Depends(get_schema_service),
) -> FileBindingsResponse:
    """Получить привязки файловых полей."""

    return call_schema_service(lambda: FileBindingsResponse(**service.get_file_bindings(schema_id)))
