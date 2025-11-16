from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class VersionPayload(BaseModel):
    """Содержимое версии документа."""

    payload: Dict[str, Any] = Field(..., description="Данные версии документа")


class VersionDTO(BaseModel):
    """Подробная информация о версии документа."""

    id: int = Field(..., description="Идентификатор версии")
    document_id: int = Field(..., description="Идентификатор документа")
    payload: Dict[str, Any] = Field(..., description="Данные версии")
    created_at: Optional[datetime] = Field(None, description="Дата создания версии")
    status: Optional[str] = Field(None, description="Статус версии (draft, clean, final)")
    is_protected: Optional[bool] = Field(None, description="Признак защищённой версии")
    is_selected: Optional[bool] = Field(None, description="Признак выбранной версии")
    validation: Optional[Dict[str, Any]] = Field(None, description="Результаты серверной валидации")


class VersionListResponse(BaseModel):
    """Ответ со списком версий документа."""

    items: List[VersionDTO] = Field(..., description="Список версий в порядке от новых к старым")


class VersionOperationResponse(BaseModel):
    """Универсальный ответ для операций без тела."""

    ok: bool = Field(..., description="Флаг успешного выполнения операции")
    details: Optional[Dict[str, Any]] = Field(None, description="Дополнительные сведения")


class VersionSelectionResponse(BaseModel):
    """Ответ при выборе версии."""

    ok: bool = Field(..., description="Флаг успешного выбора")
    selected_version_id: int = Field(..., description="Идентификатор выбранной версии")


class VersionFreezeResponse(BaseModel):
    """Ответ при изменении режима защиты версии."""

    ok: bool = Field(..., description="Флаг успешной операции")
    protected: bool = Field(..., description="Текущее состояние защиты версии")


class VersionStatusPayload(BaseModel):
    """Тело запроса для изменения статуса версии."""

    status: str = Field(..., description="Новый статус версии. Допустимо значение 'final'.")


class VersionPatchPayload(BaseModel):
    """Тело запроса для изменения данных версии."""

    payload: Dict[str, Any] = Field(..., description="Обновлённые данные версии")
