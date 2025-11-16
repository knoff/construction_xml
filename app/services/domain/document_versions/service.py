from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models_sqlalchemy import DocumentRow, DocumentVersionRow, Schema
from app.services.domain.schemas.internal import build_internal_model
from app.services.domain.documents.validation import validate_model
from app.storage import load_file_minio

_RETAIN_VERSIONS = 20


class DocumentVersionServiceError(Exception):
    """Базовое исключение домена версий документов."""

    def __init__(self, detail: str, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class DocumentVersionNotFoundError(DocumentVersionServiceError):
    def __init__(self, document_id: int, version_id: Optional[int] = None) -> None:
        if version_id is None:
            super().__init__(f"У документа {document_id} отсутствуют версии", status_code=404)
        else:
            super().__init__(
                f"Версия {version_id} не найдена или не принадлежит документу {document_id}",
                status_code=404,
            )


class DocumentVersionDocumentNotFoundError(DocumentVersionServiceError):
    def __init__(self, document_id: int) -> None:
        super().__init__(f"Документ с идентификатором {document_id} не найден", status_code=404)


class DocumentVersionStatusError(DocumentVersionServiceError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail, status_code=400)


class DocumentVersionModificationError(DocumentVersionServiceError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail, status_code=400)


class DocumentVersionService:
    """Доменные операции над версиями документа."""

    def __init__(self, db: Session) -> None:
        self._db = db

    # ---------------------- Публичные операции ----------------------

    def create_version(self, document_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        document = self._get_document(document_id)
        internal_model = self._build_internal_model(document)
        errors = validate_model(payload, internal_model) if internal_model else {}

        self._clear_selected(document_id)

        version = DocumentVersionRow(
            document_id=document_id,
            payload=payload,
            created_at=datetime.utcnow(),
            status="clean" if not errors else "draft",
            errors=self._pack_errors(errors),
            errors_count=sum(len(lst) for lst in errors.values()),
            is_protected=False,
            is_selected=True,
        )

        self._db.add(version)
        document.updated_at = datetime.utcnow()
        self._db.add(document)
        self._db.commit()
        self._db.refresh(version)

        self._enforce_retention(document_id)

        return self._serialize_version(version, recent_errors=errors)

    def list_versions(self, document_id: int) -> List[Dict[str, Any]]:
        self._ensure_document_exists(document_id)
        rows = (
            self._db.query(DocumentVersionRow)
            .filter(DocumentVersionRow.document_id == document_id)
            .order_by(DocumentVersionRow.id.desc())
            .all()
        )
        return [self._serialize_version(row) for row in rows]

    def get_version(self, document_id: int, version_id: int) -> Dict[str, Any]:
        version = self._get_version(document_id, version_id)
        return self._serialize_version(version)

    def latest_version(self, document_id: int) -> Dict[str, Any]:
        version = (
            self._db.query(DocumentVersionRow)
            .filter(DocumentVersionRow.document_id == document_id)
            .order_by(DocumentVersionRow.id.desc())
            .first()
        )
        if not version:
            raise DocumentVersionNotFoundError(document_id)
        return self._serialize_version(version)

    def update_status(self, document_id: int, version_id: int, status: str) -> Dict[str, Any]:
        if status != "final":
            raise DocumentVersionStatusError("Допустим только перевод в статус 'final'")

        document = self._get_document(document_id)
        version = self._get_version(document_id, version_id)

        internal_model = self._build_internal_model(document)
        errors = validate_model(version.payload, internal_model) if internal_model else {}

        version.errors = self._pack_errors(errors)
        version.errors_count = sum(len(lst) for lst in errors.values())
        version.status = "clean" if not errors else "draft"

        if version.status != "clean":
            self._db.commit()
            raise DocumentVersionStatusError("Перед финализацией необходимо устранить ошибки")

        version.status = "final"
        version.is_protected = True
        self._db.commit()
        self._db.refresh(version)
        return self._serialize_version(version, recent_errors=errors)

    def freeze_version(self, document_id: int, version_id: int) -> Dict[str, Any]:
        version = self._get_version(document_id, version_id)
        if getattr(version, "status", None) != "final":
            version.is_protected = True
            self._db.commit()
        return {"ok": True, "protected": True}

    def unfreeze_version(self, document_id: int, version_id: int) -> Dict[str, Any]:
        version = self._get_version(document_id, version_id)
        if getattr(version, "status", None) == "final":
            raise DocumentVersionModificationError("Финальные версии нельзя разблокировать")
        version.is_protected = False
        self._db.commit()
        return {"ok": True, "protected": False}

    def select_version(self, document_id: int, version_id: int) -> Dict[str, Any]:
        version = self._get_version(document_id, version_id)
        self._clear_selected(document_id)
        version.is_selected = True
        self._db.commit()
        return {"ok": True, "selected_version_id": version.id}

    def update_payload(self, document_id: int, version_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        version = self._get_version(document_id, version_id)
        if getattr(version, "status", None) == "final":
            raise DocumentVersionModificationError("Финальную версию изменять нельзя")

        document = self._get_document(document_id)
        internal_model = self._build_internal_model(document)
        errors = validate_model(payload, internal_model) if internal_model else {}

        version.payload = payload
        version.errors = self._pack_errors(errors)
        version.errors_count = sum(len(lst) for lst in errors.values())
        version.status = "clean" if not errors else "draft"

        self._db.commit()
        self._db.refresh(version)
        return self._serialize_version(version, recent_errors=errors)

    # ---------------------- Вспомогательные методы ----------------------

    def _get_document(self, document_id: int) -> DocumentRow:
        document = (
            self._db.query(DocumentRow)
            .options(joinedload(DocumentRow.schema_rel))
            .filter(DocumentRow.id == document_id)
            .first()
        )
        if not document:
            raise DocumentVersionDocumentNotFoundError(document_id)
        return document

    def _ensure_document_exists(self, document_id: int) -> None:
        self._get_document(document_id)

    def _get_version(self, document_id: int, version_id: int) -> DocumentVersionRow:
        version = self._db.get(DocumentVersionRow, version_id)
        if not version or version.document_id != document_id:
            raise DocumentVersionNotFoundError(document_id, version_id)
        return version

    def _build_internal_model(self, document: DocumentRow) -> Dict[str, Any]:
        schema: Optional[Schema] = getattr(document, "schema_rel", None)
        if not schema or not getattr(schema, "file_path", None):
            return {}
        content = load_file_minio(schema.file_path)
        if not content:
            return {}
        return build_internal_model(content)

    def _pack_errors(self, errors: Dict[str, List[str]]) -> Optional[Dict[str, Any]]:
        if not errors:
            return None
        return {
            "items": [
                {"path": path, "messages": messages}
                for path, messages in errors.items()
            ]
        }

    def _extract_errors(self, version: DocumentVersionRow) -> Dict[str, List[str]]:
        raw = getattr(version, "errors", None)
        if not isinstance(raw, dict):
            return {}
        items = raw.get("items", [])
        result: Dict[str, List[str]] = {}
        for item in items:
            path = item.get("path")
            messages = item.get("messages")
            if path is None or not isinstance(messages, list):
                continue
            result[path] = [str(msg) for msg in messages]
        return result

    def _build_validation(self, version: DocumentVersionRow, recent_errors: Optional[Dict[str, List[str]]]) -> Optional[Dict[str, Any]]:
        if recent_errors is not None:
            return {
                "source": "server",
                "checked_at": datetime.utcnow().isoformat(),
                "errors_count": sum(len(lst) for lst in recent_errors.values()),
                "errors": recent_errors,
            }

        errors_dict = self._extract_errors(version)
        if getattr(version, "errors_count", None) is None and not errors_dict:
            return None
        return {
            "source": "server",
            "checked_at": version.created_at.isoformat() if version.created_at else None,
            "errors_count": getattr(version, "errors_count", None),
            "errors": errors_dict,
        }

    def _serialize_version(
        self,
        version: DocumentVersionRow,
        *,
        recent_errors: Optional[Dict[str, List[str]]] = None,
    ) -> Dict[str, Any]:
        return {
            "id": version.id,
            "document_id": version.document_id,
            "payload": version.payload,
            "created_at": getattr(version, "created_at", None),
            "status": getattr(version, "status", None),
            "is_protected": getattr(version, "is_protected", None),
            "is_selected": getattr(version, "is_selected", None),
            "validation": self._build_validation(version, recent_errors),
        }

    def _clear_selected(self, document_id: int) -> None:
        self._db.query(DocumentVersionRow).filter(
            DocumentVersionRow.document_id == document_id,
            DocumentVersionRow.is_selected == True,  # noqa: E712
        ).update({"is_selected": False})
        self._db.flush()

    def _enforce_retention(self, document_id: int) -> None:
        rows = (
            self._db.query(DocumentVersionRow.id)
            .filter(
                DocumentVersionRow.document_id == document_id,
                DocumentVersionRow.is_protected == False,  # noqa: E712
                DocumentVersionRow.status != "final",
            )
            .order_by(DocumentVersionRow.id.desc())
            .offset(_RETAIN_VERSIONS)
            .all()
        )
        if not rows:
            return
        ids = [row.id for row in rows]
        self._db.query(DocumentVersionRow).filter(DocumentVersionRow.id.in_(ids)).delete(synchronize_session=False)
        self._db.commit()
