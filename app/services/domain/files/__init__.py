"""Доменный сервис работы с файлами."""

from .service import (
    EmptyFileError,
    FileNotFoundError,
    FileService,
    FileServiceError,
    FileVersionNotFoundError,
    InvalidSignatureError,
    ObjectNotFoundError,
    StorageError,
)

__all__ = [
    "FileService",
    "FileServiceError",
    "FileNotFoundError",
    "FileVersionNotFoundError",
    "ObjectNotFoundError",
    "EmptyFileError",
    "InvalidSignatureError",
    "StorageError",
]
