from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.dto.files import (
    FileDTO,
    FileDeleteResponse,
    FileListItemDTO,
    FileListResponse,
    FileOperationResponse,
    FilePatchPayload,
    FileSignatureResponse,
    FileUploadResponse,
    FileVersionDTO,
    FileVersionsResponse,
)
from app.services.domain.files import FileService

from .dependencies import call_file_service, get_file_service


router = APIRouter(
    prefix="/api/v1/files",
    tags=["Файлы"],
    responses={
        400: {"description": "Некорректный запрос"},
        404: {"description": "Файл или версия не найдены"},
        500: {"description": "Ошибка внутреннего сервиса"},
    },
)


@router.post(
    "",
    response_model=FileUploadResponse,
    summary="Загрузить новый файл",
    description="Создаёт логический файл, привязанный к объекту, и первую версию загруженного содержимого.",
)
async def upload_file(
    object_id: int = Form(..., description="Идентификатор объекта для привязки файла"),
    file: UploadFile = File(..., description="Файл для загрузки"),
    service: FileService = Depends(get_file_service),
) -> FileUploadResponse:
    """Загрузить файл и создать первую версию."""

    content = await file.read()
    filename = file.filename or "uploaded.bin"

    def action() -> FileUploadResponse:
        result = service.upload_file(
            object_id=object_id,
            filename=filename,
            content_type=file.content_type,
            content=content,
        )
        return FileUploadResponse(**result)

    return call_file_service(action)


@router.get(
    "/{file_id}",
    response_model=FileDTO,
    summary="Получить файл",
    description="Возвращает логический файл вместе с последней версией, если она существует.",
)
def get_file(
    file_id: int,
    service: FileService = Depends(get_file_service),
) -> FileDTO:
    """Получить логический файл по идентификатору."""

    return call_file_service(lambda: FileDTO(**service.get_file(file_id)))


@router.patch(
    "/{file_id}",
    response_model=FileDTO,
    summary="Обновить метаданные файла",
    description="Позволяет изменить название, реквизиты и привязку файла к объекту.",
)
def patch_file(
    file_id: int,
    payload: FilePatchPayload,
    service: FileService = Depends(get_file_service),
) -> FileDTO:
    """Обновить метаданные логического файла."""

    data = payload.model_dump(exclude_none=True)
    return call_file_service(lambda: FileDTO(**service.patch_file(file_id, data)))


@router.delete(
    "/{file_id}",
    response_model=FileDeleteResponse,
    summary="Удалить файл",
    description="Помечает файл и все его версии удалёнными и удаляет бинарные данные из хранилища.",
)
def delete_file(
    file_id: int,
    service: FileService = Depends(get_file_service),
) -> FileDeleteResponse:
    """Удалить логический файл."""

    return call_file_service(lambda: FileDeleteResponse(**service.delete_file(file_id)))


@router.get(
    "/{file_id}/versions",
    response_model=FileVersionsResponse,
    summary="Получить версии файла",
    description="Возвращает все версии файла, отсортированные по дате создания от новых к старым.",
)
def list_file_versions(
    file_id: int,
    service: FileService = Depends(get_file_service),
) -> FileVersionsResponse:
    """Получить все версии указанного файла."""

    def action() -> FileVersionsResponse:
        versions = [FileVersionDTO(**item) for item in service.list_versions(file_id)]
        return FileVersionsResponse(versions=versions)

    return call_file_service(action)


@router.post(
    "/{file_id}/versions",
    response_model=FileVersionDTO,
    summary="Создать версию файла",
    description="Добавляет новую версию существующего файла.",
)
async def create_file_version(
    file_id: int,
    file: UploadFile = File(..., description="Файл для новой версии"),
    service: FileService = Depends(get_file_service),
) -> FileVersionDTO:
    """Создать новую версию файла."""

    content = await file.read()
    filename = file.filename or "uploaded.bin"

    def action() -> FileVersionDTO:
        result = service.create_version(
            file_id,
            filename=filename,
            content_type=file.content_type,
            content=content,
        )
        return FileVersionDTO(**result)

    return call_file_service(action)


@router.delete(
    "/versions/{version_id}",
    response_model=FileOperationResponse,
    summary="Удалить версию файла",
    description="Удаляет указанную версию вместе с бинарными данными.",
)
def delete_file_version(
    version_id: int,
    service: FileService = Depends(get_file_service),
) -> FileOperationResponse:
    """Удалить конкретную версию файла."""

    return call_file_service(lambda: FileOperationResponse(**service.delete_version(version_id)))


@router.get(
    "/objects/{object_id}",
    response_model=FileListResponse,
    summary="Файлы объекта",
    description="Возвращает список файлов, привязанных к указанному объекту.",
)
def list_object_files(
    object_id: int,
    service: FileService = Depends(get_file_service),
) -> FileListResponse:
    """Получить список файлов по объекту."""

    def action() -> FileListResponse:
        items = [FileListItemDTO(**item) for item in service.list_object_files(object_id)]
        return FileListResponse(items=items)

    return call_file_service(action)


@router.post(
    "/versions/{version_id}/signatures",
    response_model=FileSignatureResponse,
    summary="Привязать подпись",
    description="Загружает файл подписи и связывает его с указанной версией файла.",
)
async def attach_signature(
    version_id: int,
    signature: UploadFile = File(..., description="Файл подписи .sig"),
    service: FileService = Depends(get_file_service),
) -> FileSignatureResponse:
    """Привязать подпись к версии файла."""

    content = await signature.read()
    filename = signature.filename or "signature.sig"

    def action() -> FileSignatureResponse:
        result = service.attach_signature(
            version_id,
            filename=filename,
            content_type=signature.content_type,
            content=content,
        )
        return FileSignatureResponse(**result)

    return call_file_service(action)
