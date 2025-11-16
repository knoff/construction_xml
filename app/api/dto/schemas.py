from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class SchemaTypeDTO(BaseModel):
    """Краткая информация о типе схемы."""

    id: int = Field(..., description="Идентификатор типа схемы")
    code: str = Field(..., description="Уникальный код типа")
    title: str = Field(..., description="Отображаемое название типа")


class SchemaTypeListResponse(BaseModel):
    """Ответ со списком типов схем."""

    items: List[SchemaTypeDTO] = Field(..., description="Все доступные типы схем")


class SchemaDTO(BaseModel):
    """Полное описание XSD-схемы."""

    id: int = Field(..., description="Идентификатор схемы")
    name: str = Field(..., description="Название схемы")
    version: Optional[str] = Field(None, description="Версия схемы, если указана")
    namespace: Optional[str] = Field(None, description="XML namespace схемы")
    description: Optional[str] = Field(None, description="Описание или назначение схемы")
    file_path: Optional[str] = Field(None, description="Путь к файлу схемы во внешнем хранилище")
    created_at: Optional[str] = Field(None, description="Дата и время загрузки схемы (ISO 8601)")
    type: Optional[SchemaTypeDTO] = Field(None, description="Привязанный тип схемы, если установлен")


class SchemaUploadResponse(BaseModel):
    """Ответ после успешной загрузки схемы."""

    model_config = ConfigDict(populate_by_name=True)

    saved: bool = Field(..., description="Флаг успешного сохранения")
    schema_: SchemaDTO = Field(..., alias="schema", description="Данные сохранённой схемы")

    @property
    def schema(self) -> SchemaDTO:
        return self.schema_


class SchemaDeleteResponse(BaseModel):
    """Ответ после удаления схемы."""

    deleted: bool = Field(..., description="Флаг успешного удаления")
    id: int = Field(..., description="Идентификатор удалённой схемы")


class UiOverridesPayload(BaseModel):
    """Тело запроса для обновления UI-настроек."""

    ui_overrides: Dict[str, Any] = Field(..., description="Произвольный словарь UI-настроек")


class UiOverridesResponse(BaseModel):
    """Ответ при запросе или обновлении UI-настроек."""

    ui_overrides: Dict[str, Any] = Field(..., description="Сохранённый набор UI-настроек")


class SchemaUpdatePayload(BaseModel):
    """Тело запроса для частичного обновления схемы."""

    name: Optional[str] = Field(None, description="Новое название схемы")
    version: Optional[str] = Field(None, description="Версия схемы")
    namespace: Optional[str] = Field(None, description="XML namespace схемы")
    description: Optional[str] = Field(None, description="Описание назначения схемы")
    type_id: Optional[int] = Field(None, description="Идентификатор типа схемы или 0 для сброса")


class SchemaListResponse(BaseModel):
    """Ответ со списком доступных схем."""

    items: List[SchemaDTO] = Field(..., description="Отсортированный список схем")


class SchemaInternalModelResponse(BaseModel):
    """Ответ с внутренней моделью схемы."""

    model_config = ConfigDict(populate_by_name=True)

    schema_: SchemaDTO = Field(..., alias="schema", description="Описание схемы")
    model: Dict[str, Any] = Field(..., description="Внутренняя модель XSD")

    @property
    def schema(self) -> SchemaDTO:
        return self.schema_


class FileHintsResponse(BaseModel):
    """Ответ с подсказками по файловым полям."""

    model_config = ConfigDict(populate_by_name=True)

    schema_: SchemaDTO = Field(..., alias="schema", description="Описание схемы")
    hints: List[str] = Field(..., description="Список путей к файловым полям")

    @property
    def schema(self) -> SchemaDTO:
        return self.schema_


class FileBindingsResponse(BaseModel):
    """Ответ с привязками файловых полей."""

    model_config = ConfigDict(populate_by_name=True)

    schema_: SchemaDTO = Field(..., alias="schema", description="Описание схемы")
    bindings: List[Dict[str, Any]] = Field(..., description="Подробная структура привязок")

    @property
    def schema(self) -> SchemaDTO:
        return self.schema_
