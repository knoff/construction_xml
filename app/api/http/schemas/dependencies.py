from __future__ import annotations

import os
from typing import Any, Callable

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.domain.schemas.service import (
    SchemaService,
    SchemaServiceConfig,
    SchemaServiceError,
)

_MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "80"))
_SCHEMA_CONFIG = SchemaServiceConfig(max_upload_mb=_MAX_UPLOAD_MB)


def get_schema_service(db: Session = Depends(get_db)) -> SchemaService:
    """Возвращает сервис работы со схемами с учётом ограничений по загрузке."""

    return SchemaService(db=db, config=_SCHEMA_CONFIG)


def call_schema_service(action: Callable[[], Any]) -> Any:
    """Упрощённый вызов сервисного метода с преобразованием ошибок в HTTP-исключения."""

    try:
        return action()
    except SchemaServiceError as exc:  # pragma: no cover - обработка исключений
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
