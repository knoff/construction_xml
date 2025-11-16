from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SignatureVerificationResponse(BaseModel):
    """Результат проверки отсоединённой подписи."""

    valid: bool = Field(..., description="Флаг успешной проверки подписи")
    subject: Optional[str] = Field(None, description="Субъект сертификата")
    issuer: Optional[str] = Field(None, description="Издатель сертификата")
    alg: Optional[str] = Field(None, description="Алгоритм подписи")
    tsa: Optional[str] = Field(None, description="Провайдер отметки времени")
    errors: List[str] = Field(default_factory=list, description="Список сообщений об ошибках")
    details: Dict[str, Any] = Field(default_factory=dict, description="Дополнительные сведения проверки")
