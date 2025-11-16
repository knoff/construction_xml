from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class ObjectDTO(BaseModel):
    """Информация об объекте."""

    model_config = ConfigDict(populate_by_name=True)

    id: int = Field(..., description="Идентификатор объекта")
    uid: str = Field(..., alias="obj_uid", description="Уникальный UID объекта")
    name: str = Field(..., description="Название объекта")
    created_at: Optional[str] = Field(None, description="Дата создания объекта (ISO 8601)")


class ObjectCreatePayload(BaseModel):
    """Запрос на создание объекта."""

    name: str = Field(..., description="Название объекта")


class ObjectUpdatePayload(BaseModel):
    """Запрос на обновление объекта."""

    name: str = Field(..., description="Новое название объекта")


class ObjectListResponse(BaseModel):
    """Ответ со списком объектов."""

    items: list[ObjectDTO] = Field(..., description="Список объектов")


class ObjectDocumentsCountResponse(BaseModel):
    """Ответ с количеством документов объекта."""

    count: int = Field(..., description="Количество документов, привязанных к объекту")


class ObjectDeleteResponse(BaseModel):
    """Ответ при удалении объекта."""

    deleted: bool = Field(..., description="Флаг успешного удаления")
    id: int = Field(..., description="Идентификатор удалённого объекта")
