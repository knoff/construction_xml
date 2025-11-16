from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ValueLinkCreatePayload(BaseModel):
    """Тело запроса для создания связи значений."""

    left_key: str = Field(..., description="Левый ключ связи")
    right_key: str = Field(..., description="Правый ключ связи")
    relation: str = Field("eq", description="Тип связи (по умолчанию равенство)")
    weight: Optional[int] = Field(None, description="Вес связи")
    meta: Optional[Dict[str, Any]] = Field(None, description="Дополнительные метаданные")


class ValueLinkDTO(BaseModel):
    """Описание связи значений."""

    id: int = Field(..., description="Идентификатор связи")
    left_key: str = Field(..., description="Левый ключ")
    right_key: str = Field(..., description="Правый ключ")
    relation: str = Field(..., description="Тип связи")
    weight: Optional[int] = Field(None, description="Вес связи")
    meta: Optional[Dict[str, Any]] = Field(None, description="Дополнительные метаданные")
    created_at: Optional[str] = Field(None, description="Дата создания (ISO 8601)")
    updated_at: Optional[str] = Field(None, description="Дата обновления (ISO 8601)")


class ValueLinkListResponse(BaseModel):
    """Ответ со списком связей."""

    items: List[ValueLinkDTO] = Field(..., description="Список связей значений")
    total: int = Field(..., description="Всего записей")
    limit: int = Field(..., description="Размер страницы")
    offset: int = Field(..., description="Смещение страницы")


class ValueLinkCheckPayload(BaseModel):
    """Тело запроса для проверки значения."""

    key: str = Field(..., description="Ключ, для которого выполняется проверка")
    value: Optional[Any] = Field(None, description="Проверяемое значение")
    context: Optional[Dict[str, Any]] = Field(None, description="Дополнительный контекст проверки")


class ValueLinkCheckResponse(BaseModel):
    """Результат проверки значения."""

    status: str = Field(..., description="Статус проверки")
    matches: List[Dict[str, Any]] = Field(..., description="Подробности совпадений")


class ValueLockUpsertPayload(BaseModel):
    """Тело запроса для создания или обновления блокировки."""

    locked_key: str = Field(..., description="Ключ, который блокируется")
    source_key: str = Field(..., description="Ключ-источник")
    mode: str = Field("sync_on_open", description="Режим блокировки")
    comment: Optional[str] = Field(None, description="Комментарий")


class ValueLockDTO(BaseModel):
    """Описание блокировки значений."""

    id: int = Field(..., description="Идентификатор блокировки")
    locked_key: str = Field(..., description="Заблокированный ключ")
    source_key: str = Field(..., description="Источниковый ключ")
    mode: str = Field(..., description="Режим блокировки")
    comment: Optional[str] = Field(None, description="Комментарий")
    created_at: Optional[str] = Field(None, description="Дата создания (ISO 8601)")
    updated_at: Optional[str] = Field(None, description="Дата обновления (ISO 8601)")


class DocumentContextDTO(BaseModel):
    """Контекст схемы документа."""

    kind: str = Field(..., description="Тип контекста")
    schema_id: int = Field(..., description="Идентификатор схемы")
    schema_name: str = Field(..., description="Название схемы")
    schema_version: Optional[str] = Field(None, description="Версия схемы")
    schema_code: Optional[str] = Field(None, description="Код схемы")
    schema_title: Optional[str] = Field(None, description="Название типа схемы")
    description: Optional[str] = Field(None, description="Описание схемы")
    updated_at: Optional[str] = Field(None, description="Дата обновления (ISO 8601)")
    has_ui_overrides: bool = Field(..., description="Есть ли UI-настройки")


class EntityContextDTO(BaseModel):
    """Контекст сущности для связей."""

    kind: str = Field(..., description="Тип контекста")
    entity: str = Field(..., description="Имя сущности")
    title: str = Field(..., description="Название сущности")
    description: Optional[str] = Field(None, description="Описание сущности")


class FieldMetaDTO(BaseModel):
    """Метаданные поля в структуре схемы/сущности."""

    path: str = Field(..., description="Полный путь к полю")
    path_segments: List[str] = Field(..., description="Сегменты пути")
    normalized_path: str = Field(..., description="Нормализованный путь")
    name: str = Field(..., description="Имя поля")
    label: str = Field(..., description="Отображаемое имя")
    label_path: List[str] = Field(..., description="Цепочка подписей")
    breadcrumb: str = Field(..., description="Хлебные крошки")
    kind: str = Field(..., description="Тип узла (attribute/element)")
    dtype: Optional[str] = Field(None, description="Тип данных")
    value_type: Optional[str] = Field(None, description="Тип значения")
    is_array: bool = Field(..., description="Признак массива")
    is_attribute: bool = Field(..., description="Является ли атрибутом")
    is_choice: bool = Field(..., description="Признак ветвления choice")
    ref_type: Optional[str] = Field(None, description="Тип ссылки")
    min_occurs: Optional[int] = Field(None, description="Минимальная кратность")
    max_occurs: Optional[int] = Field(None, description="Максимальная кратность")
    selectable: bool = Field(..., description="Доступно ли для выбора")
    has_children: bool = Field(..., description="Есть ли дочерние элементы")
    children: List["FieldMetaDTO"] = Field(default_factory=list, description="Дочерние элементы")


class DocumentFieldContextDTO(BaseModel):
    kind: str = Field(..., description="Тип контекста")
    schema_id: int = Field(..., description="Идентификатор схемы")
    schema_code: Optional[str] = Field(None, description="Код схемы")
    schema_title: Optional[str] = Field(None, description="Название типа схемы")
    schema_name: str = Field(..., description="Название схемы")
    schema_version: Optional[str] = Field(None, description="Версия схемы")
    description: Optional[str] = Field(None, description="Описание схемы")


class EntityFieldContextDTO(BaseModel):
    kind: str = Field(..., description="Тип контекста")
    entity: str = Field(..., description="Имя сущности")
    title: str = Field(..., description="Название сущности")


class DocumentFieldStructureResponse(BaseModel):
    """Структура полей документа."""

    context: DocumentFieldContextDTO
    tree: List[FieldMetaDTO]
    matches: List[FieldMetaDTO]
    available_value_types: List[str]
    query: Optional[str] = Field(None, description="Исходный поисковый запрос")
    value_type_filter: List[str] = Field(default_factory=list, description="Фильтр типов значений")


class EntityFieldStructureResponse(BaseModel):
    """Структура полей сущности."""

    context: EntityFieldContextDTO
    tree: List[FieldMetaDTO]
    matches: List[FieldMetaDTO]
    available_value_types: List[str]
    query: Optional[str] = Field(None, description="Исходный поисковый запрос")
    value_type_filter: List[str] = Field(default_factory=list, description="Фильтр типов значений")


FieldMetaDTO.model_rebuild()
