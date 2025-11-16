from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.domain.objects import ObjectService, ObjectServiceError


def get_object_service(db: Session = Depends(get_db)) -> ObjectService:
    """Возвращает сервис работы с объектами."""

    return ObjectService(db=db)


def call_object_service(action):
    """Вызывает доменный метод и преобразует ошибки в HTTP-ответы."""

    try:
        return action()
    except ObjectServiceError as exc:  # pragma: no cover - инфраструктурный слой
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
