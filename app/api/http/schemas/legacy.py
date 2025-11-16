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

legacy_router = APIRouter(
    prefix="/schemas",
    tags=["Схемы (устаревшие)"],
    responses={
        410: {"description": "Маршрут помечен как устаревший"},
    },
)


@legacy_router.get(
    "",
    summary="[legacy] Список схем",
    description="Устаревший маршрут. Используйте /api/v1/schemas.",
)
def legacy_list_schemas(service: SchemaService = Depends(get_schema_service)):
    """Совместимая версия legacy-ручки: отдаём массив схем без обёртки."""

    return call_schema_service(lambda: service.list_schemas())


@legacy_router.get(
    "/types",
    summary="[legacy] Список типов схем",
    description="Устаревший маршрут. Используйте /api/v1/schemas/types.",
)
def legacy_list_schema_types(service: SchemaService = Depends(get_schema_service)):
    """Возвращаем массив типов, как это ожидал старый фронт."""

    return call_schema_service(lambda: service.list_schema_types())


@legacy_router.post(
    "/upload",
    response_model=SchemaUploadResponse,
    summary="[legacy] Загрузка схемы",
    description="Устаревший маршрут. Используйте POST /api/v1/schemas/upload.",
)
async def legacy_upload_schema(
    file: UploadFile = File(..., description="Файл XSD для загрузки"),
    service: SchemaService = Depends(get_schema_service),
) -> SchemaUploadResponse:
    content = await file.read()
    filename = file.filename or "uploaded.xsd"
    return call_schema_service(lambda: SchemaUploadResponse(**service.upload_schema(filename=filename, content=content)))


@legacy_router.get(
    "/{schema_id}",
    response_model=SchemaDTO,
    summary="[legacy] Информация о схеме",
    description="Устаревший маршрут. Используйте GET /api/v1/schemas/{schema_id}.",
)
def legacy_get_schema(schema_id: int, service: SchemaService = Depends(get_schema_service)) -> SchemaDTO:
    return call_schema_service(lambda: SchemaDTO(**service.get_schema(schema_id)))


@legacy_router.put(
    "/{schema_id}",
    response_model=SchemaDTO,
    summary="[legacy] Обновление схемы",
    description="Устаревший маршрут. Используйте PATCH /api/v1/schemas/{schema_id}.",
)
def legacy_update_schema(
    schema_id: int,
    payload: SchemaUpdatePayload,
    service: SchemaService = Depends(get_schema_service),
) -> SchemaDTO:
    return call_schema_service(lambda: SchemaDTO(**service.update_schema(schema_id, payload.model_dump(exclude_none=True))))


@legacy_router.post(
    "/{schema_id}/delete",
    response_model=SchemaDeleteResponse,
    summary="[legacy] Удаление схемы",
    description="Устаревший маршрут. Используйте DELETE /api/v1/schemas/{schema_id}.",
)
def legacy_delete_schema(schema_id: int, service: SchemaService = Depends(get_schema_service)) -> SchemaDeleteResponse:
    return call_schema_service(lambda: SchemaDeleteResponse(**service.delete_schema(schema_id)))


@legacy_router.get(
    "/{schema_id}/internal-model",
    response_model=SchemaInternalModelResponse,
    summary="[legacy] Внутренняя модель схемы",
    description="Устаревший маршрут. Используйте GET /api/v1/schemas/{schema_id}/internal-model.",
)
def legacy_internal_model(schema_id: int, service: SchemaService = Depends(get_schema_service)) -> SchemaInternalModelResponse:
    return call_schema_service(lambda: SchemaInternalModelResponse(**service.get_internal_model(schema_id)))


@legacy_router.get(
    "/{schema_id}/ui-overrides",
    response_model=UiOverridesResponse,
    summary="[legacy] Получение UI-настроек",
    description="Устаревший маршрут. Используйте GET /api/v1/schemas/{schema_id}/ui-overrides.",
)
def legacy_get_ui_overrides(schema_id: int, service: SchemaService = Depends(get_schema_service)) -> UiOverridesResponse:
    return call_schema_service(lambda: UiOverridesResponse(**service.get_ui_overrides(schema_id)))


@legacy_router.put(
    "/{schema_id}/ui-overrides",
    response_model=UiOverridesResponse,
    summary="[legacy] Изменение UI-настроек",
    description="Устаревший маршрут. Используйте PUT /api/v1/schemas/{schema_id}/ui-overrides.",
)
def legacy_put_ui_overrides(
    schema_id: int,
    payload: UiOverridesPayload,
    service: SchemaService = Depends(get_schema_service),
) -> UiOverridesResponse:
    return call_schema_service(lambda: UiOverridesResponse(**service.update_ui_overrides(schema_id, payload.ui_overrides)))


@legacy_router.get(
    "/{schema_id}/file-hints",
    response_model=FileHintsResponse,
    summary="[legacy] Подсказки по файловым полям",
    description="Устаревший маршрут. Используйте GET /api/v1/schemas/{schema_id}/file-hints.",
)
def legacy_file_hints(schema_id: int, service: SchemaService = Depends(get_schema_service)) -> FileHintsResponse:
    return call_schema_service(lambda: FileHintsResponse(**service.get_file_hints(schema_id)))


@legacy_router.get(
    "/{schema_id}/file-bindings",
    response_model=FileBindingsResponse,
    summary="[legacy] Привязки файловых полей",
    description="Устаревший маршрут. Используйте GET /api/v1/schemas/{schema_id}/file-bindings.",
)
def legacy_file_bindings(schema_id: int, service: SchemaService = Depends(get_schema_service)) -> FileBindingsResponse:
    return call_schema_service(lambda: FileBindingsResponse(**service.get_file_bindings(schema_id)))
