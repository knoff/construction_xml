from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class FileVersionDTO(BaseModel):
    """Описание версии файла."""

    id: int = Field(..., description="Идентификатор версии")
    original_name: str = Field(..., description="Исходное имя файла")
    mime: Optional[str] = Field(None, description="MIME-тип версии")
    size: int = Field(..., description="Размер версии в байтах")
    sha256: str = Field(..., description="SHA256-хэш содержимого")
    crc32: Optional[str] = Field(None, description="CRC32 контрольная сумма")
    storage_path: Optional[str] = Field(None, description="Путь в хранилище")
    created_at: Optional[str] = Field(None, description="Дата создания версии (ISO 8601)")
    is_deleted: bool = Field(False, description="Признак удалённой версии")
    is_latest: Optional[bool] = Field(None, description="Флаг последней доступной версии")


class FileDTO(BaseModel):
    """Краткая информация о логическом файле."""

    id: int = Field(..., description="Идентификатор файла")
    object_id: Optional[int] = Field(None, description="Идентификатор связанного объекта")
    title: Optional[str] = Field(None, description="Название файла")
    doc_number: Optional[str] = Field(None, description="Номер документа")
    doc_date: Optional[str] = Field(None, description="Дата документа")
    author: Optional[str] = Field(None, description="Автор файла")
    doc_type: Optional[str] = Field(None, description="Тип документа")
    group: Optional[str] = Field(None, description="Группа файла")
    created_at: Optional[str] = Field(None, description="Дата создания записи (ISO 8601)")
    version: Optional[FileVersionDTO] = Field(None, description="Последняя версия файла")


class FileUploadResponse(BaseModel):
    """Ответ после загрузки файла."""

    id: int = Field(..., description="Идентификатор созданного файла")
    object_id: Optional[int] = Field(None, description="Привязанный объект")
    version: FileVersionDTO = Field(..., description="Созданная версия файла")


class FilePatchPayload(BaseModel):
    """Тело запроса для обновления метаданных файла."""

    title: Optional[str] = Field(None, description="Название файла")
    doc_number: Optional[str] = Field(None, description="Номер документа")
    doc_date: Optional[str] = Field(None, description="Дата документа")
    author: Optional[str] = Field(None, description="Автор файла")
    doc_type: Optional[str] = Field(None, description="Тип документа")
    group: Optional[str] = Field(None, description="Группа файла")
    object_id: Optional[int] = Field(None, description="Новый объект для перепривязки")


class FileDeleteResponse(BaseModel):
    """Ответ при удалении файла."""

    ok: bool = Field(..., description="Флаг успешного удаления")
    deleted: bool = Field(..., description="Признак удалённого файла")
    id: int = Field(..., description="Идентификатор файла")


class FileOperationResponse(BaseModel):
    """Базовый ответ для операций без сущности."""

    ok: bool = Field(..., description="Флаг успешного выполнения операции")


class FileVersionsResponse(BaseModel):
    """Ответ со списком версий файла."""

    versions: List[FileVersionDTO] = Field(..., description="Версии файла")


class FileListItemDTO(BaseModel):
    """Элемент списка файлов по объекту."""

    id: int = Field(..., description="Идентификатор файла")
    title: Optional[str] = Field(None, description="Название")
    doc_number: Optional[str] = Field(None, description="Номер документа")
    doc_date: Optional[str] = Field(None, description="Дата документа")
    author: Optional[str] = Field(None, description="Автор")
    doc_type: Optional[str] = Field(None, description="Тип")
    group: Optional[str] = Field(None, description="Группа")
    original_name: Optional[str] = Field(None, description="Имя последней версии")
    mime: Optional[str] = Field(None, description="MIME-тип последней версии")
    size: Optional[int] = Field(None, description="Размер последней версии")
    sha256: Optional[str] = Field(None, description="SHA256 последней версии")
    crc32: Optional[str] = Field(None, description="CRC32 последней версии")
    storage_path: Optional[str] = Field(None, description="Путь к последней версии")
    versions_count: int = Field(..., description="Количество актуальных версий")
    created_at: Optional[str] = Field(None, description="Дата создания файла (ISO 8601)")


class FileListResponse(BaseModel):
    """Ответ со списком файлов объекта."""

    items: List[FileListItemDTO] = Field(..., description="Список файлов")


class FileSignatureResponse(BaseModel):
    """Ответ при привязке подписи."""

    ok: bool = Field(..., description="Флаг успешной операции")
    file_id: int = Field(..., description="Идентификатор исходного файла")
    sig_id: int = Field(..., description="Идентификатор файла подписи")
