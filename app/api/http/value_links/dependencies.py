from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.domain.value_links import ValueLinkService, ValueLinkServiceError


def get_value_link_service(db: Session = Depends(get_db)) -> ValueLinkService:
    """Возвращает сервис управления связями значений."""

    return ValueLinkService(db=db)


def call_value_link_service(action):
    """Вызывает сервисный метод и преобразует исключения в HTTP-ответы."""

    try:
        return action()
    except ValueLinkServiceError as exc:  # pragma: no cover - инфраструктурный слой
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
