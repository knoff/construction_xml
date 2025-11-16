from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.domain.document_versions import (
    DocumentVersionService,
    DocumentVersionServiceError,
)


def get_document_version_service(db: Session = Depends(get_db)) -> DocumentVersionService:
    """Возвращает сервис для операций над версиями документа."""

    return DocumentVersionService(db=db)


def call_document_version_service(action):
    """Вызывает доменный метод и преобразует ошибки в HTTP-ответы."""

    try:
        return action()
    except DocumentVersionServiceError as exc:  # pragma: no cover - преобразование исключений
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
