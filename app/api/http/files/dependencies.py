from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.domain.files import FileService, FileServiceError


def get_file_service(db: Session = Depends(get_db)) -> FileService:
    """Возвращает сервис управления файлами."""

    return FileService(db=db)


def call_file_service(action):
    """Вызывает сервисный метод и преобразует ошибки в HTTP-ответы."""

    try:
        return action()
    except FileServiceError as exc:  # pragma: no cover - инфраструктурный код
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
