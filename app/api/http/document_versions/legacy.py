from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status

from app.services.domain.document_versions import DocumentVersionService

from .dependencies import call_document_version_service, get_document_version_service

legacy_router = APIRouter(
    prefix="/documents",
    tags=["Версии документов (устаревшие)"],
    responses={410: {"description": "Маршрут помечен как устаревший"}},
)


@legacy_router.get("/{document_id}/versions")
def legacy_list_versions(
    document_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    return call_document_version_service(lambda: service.list_versions(document_id))


@legacy_router.post(
    "/{document_id}/versions",
    status_code=status.HTTP_201_CREATED,
)
def legacy_create_version(
    document_id: int,
    payload: dict,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    return call_document_version_service(lambda: service.create_version(document_id, payload or {}))


@legacy_router.get("/{document_id}/versions/latest")
def legacy_get_latest_version(
    document_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    return call_document_version_service(lambda: service.latest_version(document_id))


@legacy_router.get("/{document_id}/versions/{version_id}")
def legacy_get_version(
    document_id: int,
    version_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    return call_document_version_service(lambda: service.get_version(document_id, version_id))


@legacy_router.get("/{document_id}/version/{version_id}")
def legacy_get_version_alias(
    document_id: int,
    version_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    return call_document_version_service(lambda: service.get_version(document_id, version_id))


@legacy_router.patch("/{document_id}/versions/{version_id}/status")
def legacy_update_version_status(
    document_id: int,
    version_id: int,
    payload: dict,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    status_value = (payload or {}).get("status")
    result = call_document_version_service(lambda: service.update_status(document_id, version_id, status_value))
    return {"ok": True, "id": result["id"], "status": result["status"], "validation": result.get("validation")}


@legacy_router.post("/{document_id}/versions/{version_id}/freeze")
def legacy_freeze_version(
    document_id: int,
    version_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    return call_document_version_service(lambda: service.freeze_version(document_id, version_id))


@legacy_router.post("/{document_id}/versions/{version_id}/unfreeze")
def legacy_unfreeze_version(
    document_id: int,
    version_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    return call_document_version_service(lambda: service.unfreeze_version(document_id, version_id))


@legacy_router.post("/{document_id}/versions/{version_id}/select")
def legacy_select_version(
    document_id: int,
    version_id: int,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    return call_document_version_service(lambda: service.select_version(document_id, version_id))


@legacy_router.patch("/{document_id}/versions/{version_id}")
def legacy_update_version(
    document_id: int,
    version_id: int,
    payload: dict,
    service: DocumentVersionService = Depends(get_document_version_service),
):
    return call_document_version_service(lambda: service.update_payload(document_id, version_id, payload or {}))
