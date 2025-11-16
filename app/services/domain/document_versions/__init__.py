"""Доменные сервисы для управления версиями документов."""

from .service import (
    DocumentVersionDocumentNotFoundError,
    DocumentVersionModificationError,
    DocumentVersionNotFoundError,
    DocumentVersionService,
    DocumentVersionServiceError,
    DocumentVersionStatusError,
)

__all__ = [
    "DocumentVersionService",
    "DocumentVersionServiceError",
    "DocumentVersionNotFoundError",
    "DocumentVersionDocumentNotFoundError",
    "DocumentVersionStatusError",
    "DocumentVersionModificationError",
]
