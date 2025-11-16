from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.services.domain.value_links import ValueLinkService

from .dependencies import call_value_link_service, get_value_link_service

legacy_router = APIRouter(
    prefix="/value-links",
    tags=["Связи значений (устаревшие)"],
    responses={410: {"description": "Маршрут помечен как устаревший"}},
)
legacy_locks_router = APIRouter(
    prefix="/value-locks",
    tags=["Блокировки значений (устаревшие)"],
    responses={410: {"description": "Маршрут помечен как устаревший"}},
)


@legacy_router.get("")
def legacy_list_links(
    key: Optional[str] = Query(None),
    relation: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    service: ValueLinkService = Depends(get_value_link_service),
):
    return call_value_link_service(lambda: service.list_links(key=key, relation=relation, limit=limit, offset=offset))


@legacy_router.post("")
def legacy_create_link(payload: dict, service: ValueLinkService = Depends(get_value_link_service)):
    return call_value_link_service(lambda: service.create_link(**(payload or {})))


@legacy_router.delete("/{link_id}")
def legacy_delete_link(link_id: int, service: ValueLinkService = Depends(get_value_link_service)):
    return call_value_link_service(lambda: service.delete_link(link_id))


@legacy_router.post("/check")
def legacy_check_value(payload: dict, service: ValueLinkService = Depends(get_value_link_service)):
    return call_value_link_service(lambda: service.check_value(**(payload or {})))


@legacy_locks_router.get("")
def legacy_list_locks(
    locked_key: Optional[str] = Query(None),
    service: ValueLinkService = Depends(get_value_link_service),
):
    return call_value_link_service(lambda: service.list_locks(locked_key=locked_key))


@legacy_locks_router.post("")
def legacy_upsert_lock(payload: dict, service: ValueLinkService = Depends(get_value_link_service)):
    return call_value_link_service(lambda: service.upsert_lock(**(payload or {})))


@legacy_locks_router.delete("/{lock_id}")
def legacy_delete_lock(lock_id: int, service: ValueLinkService = Depends(get_value_link_service)):
    return call_value_link_service(lambda: service.delete_lock(lock_id))


@legacy_router.get("/contexts/documents")
def legacy_document_contexts(service: ValueLinkService = Depends(get_value_link_service)):
    return call_value_link_service(lambda: service.list_document_contexts())


@legacy_router.get("/contexts/entities")
def legacy_entity_contexts(service: ValueLinkService = Depends(get_value_link_service)):
    return call_value_link_service(lambda: service.list_entity_contexts())


@legacy_router.get("/structures/documents/{schema_id}")
def legacy_document_structures(
    schema_id: int,
    query: Optional[str] = Query(None),
    value_types: Optional[list[str]] = Query(None),
    service: ValueLinkService = Depends(get_value_link_service),
):
    return call_value_link_service(
        lambda: service.get_document_field_structure(schema_id=schema_id, query=query, value_types=value_types)
    )


@legacy_router.get("/structures/entities/{entity}")
def legacy_entity_structures(
    entity: str,
    query: Optional[str] = Query(None),
    value_types: Optional[list[str]] = Query(None),
    service: ValueLinkService = Depends(get_value_link_service),
):
    return call_value_link_service(
        lambda: service.get_entity_field_structure(entity=entity, query=query, value_types=value_types)
    )
