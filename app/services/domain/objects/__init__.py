"""Доменный сервис работы с объектами."""

from .service import (
    ObjectNameEmptyError,
    ObjectNotFoundError,
    ObjectService,
    ObjectServiceError,
)

__all__ = [
    "ObjectService",
    "ObjectServiceError",
    "ObjectNotFoundError",
    "ObjectNameEmptyError",
]
