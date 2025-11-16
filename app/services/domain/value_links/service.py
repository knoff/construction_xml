from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models_sqlalchemy import ValueLinkRow, ValueLockRow
from app.services.infrastructure import value_links as base


def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt else None


class ValueLinkServiceError(Exception):
    """Базовое исключение для операций со связями значений."""

    def __init__(self, detail: str, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class ValueLinkConflictError(ValueLinkServiceError):
    def __init__(self) -> None:
        super().__init__("Связь уже существует", status_code=409)


class ValueLinkNotFoundError(ValueLinkServiceError):
    def __init__(self, link_id: int) -> None:
        super().__init__(f"Связь с идентификатором {link_id} не найдена", status_code=404)


class ValueLockNotFoundError(ValueLinkServiceError):
    def __init__(self, lock_id: int) -> None:
        super().__init__(f"Блокировка с идентификатором {lock_id} не найдена", status_code=404)


class ValueLinkValidationError(ValueLinkServiceError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail, status_code=400)


class SchemaNotFoundError(ValueLinkServiceError):
    def __init__(self) -> None:
        super().__init__("Схема не найдена", status_code=404)


class SchemaFileUnavailableError(ValueLinkServiceError):
    def __init__(self) -> None:
        super().__init__("Не удалось загрузить файл схемы", status_code=502)


class EntityNotSupportedError(ValueLinkServiceError):
    def __init__(self) -> None:
        super().__init__("Сущность не поддерживается", status_code=404)


class ValueLinkService:
    """Бизнес-логика для управления связями значений и блокировками."""

    def __init__(self, db: Session) -> None:
        self._db = db

    # --- связи значений --------------------------------------------------

    def list_links(
        self,
        *,
        key: Optional[str] = None,
        relation: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        result = base.list_value_links(
            self._db,
            key=key,
            relation=relation,
            limit=limit,
            offset=offset,
        )
        items = [self._serialize_value_link(row) for row in result.get("items", [])]
        return {
            "items": items,
            "total": result.get("total", 0),
            "limit": result.get("limit", limit),
            "offset": result.get("offset", offset),
        }

    def create_link(
        self,
        *,
        left_key: str,
        right_key: str,
        relation: str = "eq",
        weight: Optional[int] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        try:
            row = base.create_value_link(
                self._db,
                left_key=left_key,
                right_key=right_key,
                relation=relation,
                weight=weight,
                meta=meta,
            )
        except IntegrityError as exc:
            raise ValueLinkConflictError() from exc
        return self._serialize_value_link(row)

    def delete_link(self, link_id: int) -> None:
        success = base.delete_value_link(self._db, link_id=link_id)
        if not success:
            raise ValueLinkNotFoundError(link_id)

    def check_value(self, *, key: str, value: Any, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return base.check_value(self._db, key=key, value=value, context=context)

    # --- блокировки ------------------------------------------------------

    def list_locks(self, *, locked_key: Optional[str] = None) -> List[Dict[str, Any]]:
        rows = base.list_value_locks(self._db, locked_key=locked_key)
        return [self._serialize_value_lock(row) for row in rows]

    def upsert_lock(
        self,
        *,
        locked_key: str,
        source_key: str,
        mode: str,
        comment: Optional[str],
    ) -> Dict[str, Any]:
        row = base.upsert_value_lock(
            self._db,
            locked_key=locked_key,
            source_key=source_key,
            mode=mode,
            comment=comment,
        )
        return self._serialize_value_lock(row)

    def delete_lock(self, lock_id: int) -> None:
        success = base.delete_value_lock(self._db, lock_id=lock_id)
        if not success:
            raise ValueLockNotFoundError(lock_id)

    # --- контексты и структуры ------------------------------------------

    def list_document_contexts(self) -> List[Dict[str, Any]]:
        rows = base.list_document_contexts(self._db)
        return [self._serialize_document_context(row) for row in rows]

    def list_entity_contexts(self) -> List[Dict[str, Any]]:
        rows = base.list_entity_contexts()
        return [
            {
                "kind": "entity",
                "entity": row.get("entity"),
                "title": row.get("title"),
                "description": row.get("description"),
            }
            for row in rows
        ]

    def get_document_field_structure(
        self,
        *,
        schema_id: int,
        query: Optional[str] = None,
        value_types: Optional[Iterable[str]] = None,
    ) -> Dict[str, Any]:
        try:
            return base.get_document_field_structure(
                self._db,
                schema_id=schema_id,
                query=query,
                value_types=value_types,
            )
        except ValueError as exc:
            code = str(exc)
            if code == "schema_not_found":
                raise SchemaNotFoundError() from exc
            if code == "schema_file_missing":
                raise SchemaFileUnavailableError() from exc
            raise ValueLinkValidationError("Некорректный запрос") from exc

    def get_entity_field_structure(
        self,
        *,
        entity: str,
        query: Optional[str] = None,
        value_types: Optional[Iterable[str]] = None,
    ) -> Dict[str, Any]:
        try:
            return base.get_entity_field_structure(
                entity=entity,
                query=query,
                value_types=value_types,
            )
        except ValueError as exc:
            code = str(exc)
            if code == "entity_not_supported":
                raise EntityNotSupportedError() from exc
            raise ValueLinkValidationError("Некорректный запрос") from exc

    # --- сериализация ----------------------------------------------------

    @staticmethod
    def _serialize_value_link(row: ValueLinkRow) -> Dict[str, Any]:
        return {
            "id": row.id,
            "left_key": row.left_key,
            "right_key": row.right_key,
            "relation": row.relation,
            "weight": getattr(row, "weight", None),
            "meta": getattr(row, "meta", None),
            "created_at": _iso(getattr(row, "created_at", None)),
            "updated_at": _iso(getattr(row, "updated_at", None)),
        }

    @staticmethod
    def _serialize_value_lock(row: ValueLockRow) -> Dict[str, Any]:
        return {
            "id": row.id,
            "locked_key": row.locked_key,
            "source_key": row.source_key,
            "mode": row.mode,
            "comment": getattr(row, "comment", None),
            "created_at": _iso(getattr(row, "created_at", None)),
            "updated_at": _iso(getattr(row, "updated_at", None)),
        }

    @staticmethod
    def _serialize_document_context(row: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "kind": "document",
            "schema_id": row.get("schema_id"),
            "schema_name": row.get("schema_name"),
            "schema_version": row.get("schema_version"),
            "schema_code": row.get("schema_code"),
            "schema_title": row.get("schema_title"),
            "description": row.get("description"),
            "updated_at": _iso(row.get("updated_at")),
            "has_ui_overrides": bool(row.get("has_ui_overrides", False)),
        }
