from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.services.domain.objects import ObjectService

from .dependencies import call_object_service, get_object_service

legacy_router = APIRouter(
    prefix="/objects",
    tags=["Объекты (устаревшие)"],
    responses={410: {"description": "Маршрут помечен как устаревший"}},
)


@legacy_router.get("")
def legacy_list_objects(service: ObjectService = Depends(get_object_service)):
    return call_object_service(lambda: service.list_objects())


@legacy_router.post("")
def legacy_create_object(payload: dict, service: ObjectService = Depends(get_object_service)):
    name = (payload or {}).get("name", "")
    return call_object_service(lambda: service.create_object(name))


@legacy_router.get("/{object_id}")
def legacy_get_object(object_id: int, service: ObjectService = Depends(get_object_service)):
    return call_object_service(lambda: service.get_object(object_id))


@legacy_router.patch("/{object_id}")
def legacy_update_object(object_id: int, payload: dict, service: ObjectService = Depends(get_object_service)):
    name = (payload or {}).get("name", "")
    return call_object_service(lambda: service.update_object(object_id, name))


@legacy_router.delete("/{object_id}")
def legacy_delete_object(
    object_id: int,
    delete_documents: bool = Query(False),
    service: ObjectService = Depends(get_object_service),
):
    return call_object_service(lambda: service.delete_object(object_id, delete_documents))


@legacy_router.get("/{object_id}/documents/count")
def legacy_documents_count(object_id: int, service: ObjectService = Depends(get_object_service)):
    return call_object_service(lambda: service.count_documents(object_id))
