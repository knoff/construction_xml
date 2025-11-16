from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session, joinedload

from app.models_sqlalchemy import DocumentRow, DocumentVersionRow, ObjectRow, Schema

_ALLOWED_STATUSES = {"draft", "final"}


class DocumentServiceError(Exception):
    """Базовое исключение домена документов."""

    def __init__(self, detail: str, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class DocumentNotFoundError(DocumentServiceError):
    def __init__(self, document_id: int) -> None:
        super().__init__(f"Документ с идентификатором {document_id} не найден", status_code=404)


class ObjectNotFoundError(DocumentServiceError):
    def __init__(self, object_id: int) -> None:
        super().__init__(f"Объект с идентификатором {object_id} не найден", status_code=400)


class ObjectIdMissingError(DocumentServiceError):
    def __init__(self) -> None:
        super().__init__("Идентификатор объекта не указан", status_code=400)


class SchemaNotFoundError(DocumentServiceError):
    def __init__(self, schema_id: int) -> None:
        super().__init__(f"Схема с идентификатором {schema_id} не найдена", status_code=400)


class InvalidStatusError(DocumentServiceError):
    def __init__(self, status: str) -> None:
        super().__init__(
            f"Недопустимый статус '{status}'. Допустимые значения: {', '.join(sorted(_ALLOWED_STATUSES))}",
            status_code=400,
        )


class DocumentService:
    """Бизнес-операции для работы с документами."""

    def __init__(self, db: Session) -> None:
        self._db = db

    # ----------------------- публичные методы -----------------------

    def list_documents(self) -> list[Dict[str, Any]]:
        rows = (
            self._db.query(DocumentRow)
            .options(joinedload(DocumentRow.object_rel), joinedload(DocumentRow.schema_rel))
            .order_by(DocumentRow.id.desc())
            .all()
        )
        return [self._serialize_document(row) for row in rows]

    def create_document(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        object_id = payload.get("object_id")
        schema_id = payload.get("schema_id")
        schema_version = payload.get("schema_version")

        obj = self._get_object(object_id)
        schema = self._get_schema(schema_id)

        document = DocumentRow(
            doc_uid=uuid.uuid4().hex,
            cdm={},
            object_id=obj.id,
            schema_id=str(schema.id) if schema else None,
            schema_version=schema_version or schema.version if schema else None,
            status="draft",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self._db.add(document)
        self._db.commit()
        self._db.refresh(document)
        return self._serialize_document(document, object_override=obj, schema_override=schema)

    def get_document(self, document_id: int) -> Dict[str, Any]:
        document = self._get_document(document_id)
        version = self._get_latest_version(document.id)
        base = self._serialize_document(document)
        base["latest_version_id"] = version.get("id") if version else None
        base["payload"] = version.get("payload") if version else None
        return base

    def update_document(self, document_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        document = self._get_document(document_id)

        if "status" in payload and payload["status"] is not None:
            status = payload["status"]
            if status not in _ALLOWED_STATUSES:
                raise InvalidStatusError(status)
            document.status = status

        if "object_id" in payload and payload["object_id"] is not None:
            obj = self._get_object(payload["object_id"])
            document.object_id = obj.id
        else:
            obj = getattr(document, "object_rel", None)

        document.updated_at = datetime.utcnow()
        self._db.commit()
        self._db.refresh(document)

        schema = getattr(document, "schema_rel", None)
        return self._serialize_document(document, object_override=obj, schema_override=schema)

    def delete_document(self, document_id: int) -> bool:
        document = self._get_document(document_id)
        self._db.delete(document)
        self._db.commit()
        return True

    # ----------------------- вспомогательные методы -----------------------

    def _get_document(self, document_id: int) -> DocumentRow:
        document = (
            self._db.query(DocumentRow)
            .options(joinedload(DocumentRow.object_rel), joinedload(DocumentRow.schema_rel))
            .filter(DocumentRow.id == document_id)
            .first()
        )
        if not document:
            raise DocumentNotFoundError(document_id)
        return document

    def _get_object(self, object_id: Optional[int]) -> ObjectRow:
        if object_id is None:
            raise ObjectIdMissingError()
        obj = self._db.get(ObjectRow, object_id)
        if not obj:
            raise ObjectNotFoundError(object_id)
        return obj

    def _get_schema(self, schema_id: Optional[int]) -> Optional[Schema]:
        if schema_id is None:
            return None
        schema = self._db.get(Schema, schema_id)
        if not schema:
            raise SchemaNotFoundError(schema_id)
        return schema

    def _get_latest_version(self, document_id: int) -> Optional[Dict[str, Any]]:
        version = (
            self._db.query(DocumentVersionRow)
            .filter(DocumentVersionRow.document_id == document_id, DocumentVersionRow.is_selected.is_(True))
            .order_by(DocumentVersionRow.id.desc())
            .first()
        )
        if not version:
            version = (
                self._db.query(DocumentVersionRow)
                .filter(DocumentVersionRow.document_id == document_id)
                .order_by(DocumentVersionRow.id.desc())
                .first()
            )
        if not version:
            return None
        return {"id": version.id, "payload": version.payload}

    def _serialize_document(
        self,
        document: DocumentRow,
        *,
        object_override: Optional[ObjectRow] = None,
        schema_override: Optional[Schema] = None,
    ) -> Dict[str, Any]:
        obj = object_override or getattr(document, "object_rel", None)
        schema = schema_override or getattr(document, "schema_rel", None)

        object_data: Optional[Dict[str, Any]] = None
        if obj is not None:
            object_data = {
                "id": obj.id,
                "uid": getattr(obj, "obj_uid", None),
                "name": getattr(obj, "name", None),
            }

        schema_data: Optional[Dict[str, Any]] = None
        if schema is not None:
            schema_data = {
                "id": schema.id,
                "name": getattr(schema, "name", None),
                "version": getattr(schema, "version", None),
                "code": getattr(getattr(schema, "type", None), "code", None),
            }

        return {
            "id": document.id,
            "doc_uid": document.doc_uid,
            "status": document.status,
            "object": object_data,
            "schema": schema_data,
            "created_at": getattr(document, "created_at", None),
            "updated_at": getattr(document, "updated_at", None),
        }
