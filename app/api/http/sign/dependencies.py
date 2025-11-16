from __future__ import annotations

from fastapi import Depends

from app.services.domain.sign import SignService


def get_sign_service() -> SignService:
    """Возвращает сервис проверки подписей."""

    return SignService()
