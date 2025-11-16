from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models_sqlalchemy import Schema, SchemaType
from app.storage import delete_file_minio, load_file_minio, save_file_minio
from . import classifier, internal, xsd_files, xsd_parser

logger = logging.getLogger(__name__)


class SchemaServiceError(Exception):
    """Базовое исключение домена XSD-схем."""

    def __init__(self, detail: str, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class SchemaNotFoundError(SchemaServiceError):
    def __init__(self, schema_id: int) -> None:
        super().__init__(f"Схема с идентификатором {schema_id} не найдена", status_code=404)


class SchemaFileNotFoundError(SchemaServiceError):
    def __init__(self) -> None:
        super().__init__("У схемы отсутствует файл", status_code=400)


class SchemaStorageError(SchemaServiceError):
    def __init__(self, detail: str = "Не удалось прочитать файл XSD из хранилища") -> None:
        super().__init__(detail, status_code=500)


@dataclass(slots=True)
class SchemaServiceConfig:
    max_upload_mb: int = 80

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


class SchemaService:
    """Доменные операции по управлению XSD-схемами."""

    def __init__(self, db: Session, config: Optional[SchemaServiceConfig] = None) -> None:
        self._db = db
        self._config = config or SchemaServiceConfig()

    def list_schemas(self) -> List[Dict[str, Any]]:
        rows = self._db.query(Schema).order_by(Schema.created_at.desc()).all()
        return [self._serialize_schema(schema) for schema in rows]

    def list_schema_types(self) -> List[Dict[str, Any]]:
        rows = self._db.query(SchemaType).order_by(SchemaType.title.asc()).all()
        return [
            {
                "id": schema_type.id,
                "code": schema_type.code,
                "title": schema_type.title,
            }
            for schema_type in rows
        ]

    def upload_schema(self, *, filename: str, content: bytes) -> Dict[str, Any]:
        self._validate_filename(filename)
        self._validate_size(content)

        storage_key = save_file_minio("schemas", filename, content)

        metadata = xsd_parser.extract_metadata(content, filename=filename)
        matched = classifier.classify(filename, content, db=self._db)

        name = metadata.get("name") or filename
        description = metadata.get("description")
        type_id: Optional[int] = None

        if matched:
            schema_type = self._db.query(SchemaType).filter(SchemaType.code == matched.code).first()
            if schema_type:
                type_id = schema_type.id
                name = schema_type.title or name
                if schema_type.description:
                    description = schema_type.description

        schema = Schema(
            name=name,
            version=metadata.get("version"),
            namespace=metadata.get("namespace"),
            description=description,
            file_path=storage_key,
            created_at=datetime.utcnow(),
            type_id=type_id,
        )
        self._db.add(schema)
        self._db.commit()
        self._db.refresh(schema)

        return {"saved": True, "schema": self._serialize_schema(schema)}

    def get_schema(self, schema_id: int) -> Dict[str, Any]:
        schema = self._get_schema(schema_id)
        return self._serialize_schema(schema)

    def get_internal_model(self, schema_id: int) -> Dict[str, Any]:
        schema = self._get_schema(schema_id)
        content = self._load_schema_content(schema)
        model = internal.build_internal_model(content)
        return {
            "schema": self._serialize_schema(schema) | {"ui_overrides": schema.ui_overrides or {}},
            "model": model,
        }

    def get_ui_overrides(self, schema_id: int) -> Dict[str, Any]:
        schema = self._get_schema(schema_id)
        return {"ui_overrides": schema.ui_overrides or {}}

    def update_ui_overrides(self, schema_id: int, overrides: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(overrides, dict):
            raise SchemaServiceError("Поле ui_overrides должно быть объектом", status_code=400)
        schema = self._get_schema(schema_id)
        schema.ui_overrides = overrides
        self._db.add(schema)
        self._db.commit()
        self._db.refresh(schema)
        return {"ok": True, "ui_overrides": schema.ui_overrides or {}}

    def update_schema(self, schema_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        schema = self._get_schema(schema_id)
        type_id = payload.get("type_id")
        if type_id is not None:
            if type_id in (0, "0"):
                schema.type_id = None
            else:
                schema_type = self._db.get(SchemaType, type_id)
                if not schema_type:
                    raise SchemaServiceError("Указанный тип схемы не найден", status_code=400)
                schema.type_id = schema_type.id
        for field in ("name", "version", "namespace", "description"):
            if field in payload and payload[field] is not None:
                value = payload[field]
                if isinstance(value, str):
                    value = value.strip()
                setattr(schema, field, value)
        self._db.commit()
        self._db.refresh(schema)
        return self._serialize_schema(schema)

    def delete_schema(self, schema_id: int) -> Dict[str, Any]:
        schema = self._get_schema(schema_id)
        if schema.file_path:
            delete_file_minio(schema.file_path)
        self._db.delete(schema)
        self._db.commit()
        return {"deleted": True, "id": schema_id}

    def get_file_hints(self, schema_id: int) -> Dict[str, Any]:
        schema = self._get_schema(schema_id)
        content = self._load_schema_content(schema)
        model = internal.build_internal_model(content)
        return {
            "schema": self._serialize_schema(schema),
            "hints": xsd_files.detect_file_hints(model),
        }

    def get_file_bindings(self, schema_id: int) -> Dict[str, Any]:
        schema = self._get_schema(schema_id)
        content = self._load_schema_content(schema)
        model = internal.build_internal_model(content)
        hints = xsd_files.detect_file_hints(model)
        return {
            "schema": self._serialize_schema(schema),
            "bindings": xsd_files.build_file_bindings(model, hints),
        }

    def _get_schema(self, schema_id: int) -> Schema:
        schema = self._db.get(Schema, schema_id)
        if not schema:
            raise SchemaNotFoundError(schema_id)
        return schema

    def _load_schema_content(self, schema: Schema) -> bytes:
        if not schema.file_path:
            raise SchemaFileNotFoundError()
        content = load_file_minio(schema.file_path)
        if not content:
            raise SchemaStorageError()
        return content

    def _validate_filename(self, filename: str) -> None:
        if not (filename or "").lower().endswith(".xsd"):
            raise SchemaServiceError("Ожидается файл с расширением .xsd", status_code=400)

    def _validate_size(self, content: bytes) -> None:
        if len(content) > self._config.max_upload_bytes:
            raise SchemaServiceError(
                f"Файл превышает допустимый размер {self._config.max_upload_mb} МБ", status_code=413
            )

    @staticmethod
    def _serialize_schema(schema: Schema) -> Dict[str, Any]:
        return {
            "id": schema.id,
            "name": schema.name,
            "version": schema.version,
            "namespace": schema.namespace,
            "description": schema.description,
            "file_path": schema.file_path,
            "created_at": schema.created_at.isoformat() if getattr(schema, "created_at", None) else None,
            "type": (
                {
                    "id": schema.type.id,
                    "code": schema.type.code,
                    "title": schema.type.title,
                }
                if getattr(schema, "type", None)
                else None
            ),
        }
