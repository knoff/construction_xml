from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.services.domain.files import FileService

from .dependencies import call_file_service, get_file_service

legacy_router = APIRouter(
    prefix="/files",
    tags=["Файлы (устаревшие)"],
    responses={410: {"description": "Маршрут помечен как устаревший"}},
)


@legacy_router.post("", status_code=status.HTTP_201_CREATED)
async def legacy_upload_file(
    object_id: int = Form(...),
    file: UploadFile = File(...),
    service: FileService = Depends(get_file_service),
):
    content = await file.read()
    filename = file.filename or "uploaded.bin"
    return call_file_service(
        lambda: service.upload_file(
            object_id=object_id,
            filename=filename,
            content_type=file.content_type,
            content=content,
        )
    )


@legacy_router.get("/{file_id}")
def legacy_get_file(file_id: int, service: FileService = Depends(get_file_service)):
    return call_file_service(lambda: service.get_file(file_id))


@legacy_router.patch("/{file_id}")
def legacy_patch_file(
    file_id: int,
    payload: dict,
    service: FileService = Depends(get_file_service),
):
    return call_file_service(lambda: service.patch_file(file_id, payload or {}))


@legacy_router.delete("/{file_id}")
def legacy_delete_file(file_id: int, service: FileService = Depends(get_file_service)):
    return call_file_service(lambda: service.delete_file(file_id))


@legacy_router.get("/{file_id}/versions")
def legacy_list_versions(file_id: int, service: FileService = Depends(get_file_service)):
    return call_file_service(lambda: service.list_versions(file_id))


@legacy_router.post("/{file_id}/versions", status_code=status.HTTP_201_CREATED)
async def legacy_create_version(
    file_id: int,
    file: UploadFile = File(...),
    service: FileService = Depends(get_file_service),
):
    content = await file.read()
    filename = file.filename or "uploaded.bin"
    return call_file_service(
        lambda: service.create_version(
            file_id,
            filename=filename,
            content_type=file.content_type,
            content=content,
        )
    )


@legacy_router.delete("/versions/{version_id}")
def legacy_delete_version(version_id: int, service: FileService = Depends(get_file_service)):
    return call_file_service(lambda: service.delete_version(version_id))


@legacy_router.get("/objects/{object_id}")
def legacy_list_object_files(object_id: int, service: FileService = Depends(get_file_service)):
    return call_file_service(lambda: service.list_object_files(object_id))


@legacy_router.post("/versions/{version_id}/signatures", status_code=status.HTTP_201_CREATED)
async def legacy_attach_signature(
    version_id: int,
    signature: UploadFile = File(...),
    service: FileService = Depends(get_file_service),
):
    content = await signature.read()
    filename = signature.filename or "signature.sig"
    return call_file_service(
        lambda: service.attach_signature(
            version_id,
            filename=filename,
            content_type=signature.content_type,
            content=content,
        )
    )
