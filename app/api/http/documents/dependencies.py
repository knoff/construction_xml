from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.domain.documents import DocumentService, DocumentServiceError


def get_document_service(db: Session = Depends(get_db)) -> DocumentService:
    """Возвращает сервис управления документами."""

    return DocumentService(db=db)


def call_document_service(action):
    """Вызывает доменный метод и преобразует ошибки в HTTP-ответы."""

    try:
        return action()
    except DocumentServiceError as exc:  # pragma: no cover - инфраструктурный код
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
