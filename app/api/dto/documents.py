from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class DocumentObjectDTO(BaseModel):
    """Описание объекта, к которому привязан документ."""

    id: int = Field(..., description="Идентификатор объекта")
    uid: Optional[str] = Field(None, description="Уникальный идентификатор объекта")
    name: Optional[str] = Field(None, description="Название объекта")


class DocumentSchemaDTO(BaseModel):
    """Описание XSD-схемы, с которой связан документ."""

    id: int = Field(..., description="Идентификатор схемы")
    name: Optional[str] = Field(None, description="Название схемы")
    version: Optional[str] = Field(None, description="Версия схемы")
    code: Optional[str] = Field(None, description="Код типа схемы")


class DocumentDTO(BaseModel):
    """Базовое представление документа."""

    model_config = ConfigDict(populate_by_name=True)

    id: int = Field(..., description="Идентификатор документа")
    doc_uid: str = Field(..., description="Уникальный идентификатор документа (внешний UID)")
    status: str = Field(..., description="Текущий статус документа")
    object: Optional[DocumentObjectDTO] = Field(None, description="Связанный объект, если установлен")
    schema_: Optional[DocumentSchemaDTO] = Field(None, alias="schema", description="Связанная XSD-схема, если указана")
    created_at: Optional[datetime] = Field(None, description="Дата создания документа")
    updated_at: Optional[datetime] = Field(None, description="Дата последнего изменения")

    @property
    def schema(self) -> Optional[DocumentSchemaDTO]:
        return self.schema_


class DocumentWithVersionDTO(DocumentDTO):
    """Документ с дополнительной информацией о последней версии."""

    latest_version_id: Optional[int] = Field(None, description="Идентификатор последней версии документа")
    payload: Optional[Any] = Field(None, description="Данные последней версии документа")


class DocumentListResponse(BaseModel):
    """Ответ со списком документов."""

    items: list[DocumentDTO] = Field(..., description="Отсортированный список документов")


class DocumentCreatePayload(BaseModel):
    """Тело запроса для создания документа."""

    object_id: int = Field(..., description="Идентификатор объекта, к которому привязывается документ")
    schema_id: int = Field(..., description="Идентификатор XSD-схемы")
    schema_version: Optional[str] = Field(None, description="Версия схемы, если требуется указать вручную")


class DocumentPatchPayload(BaseModel):
    """Тело запроса для частичного обновления документа."""

    status: Optional[str] = Field(None, description="Новый статус документа (draft или final)")
    object_id: Optional[int] = Field(None, description="Новый идентификатор объекта для перепривязки")


class DocumentDeleteResponse(BaseModel):
    """Ответ при удалении документа."""

    deleted: bool = Field(..., description="Флаг успешного удаления документа")
    id: int = Field(..., description="Идентификатор удалённого документа")
