from __future__ import annotations

from typing import Any, Dict


class SignService:
    """Проверка электронных подписей (заглушка MVP)."""

    def verify_detached_signature(self, file_bytes: bytes, sig_bytes: bytes) -> Dict[str, Any]:
        # TODO: заменить на реальную проверку CMS/PKCS#7 при интеграции с криптопровайдером
        return {
            "valid": False,
            "subject": None,
            "issuer": None,
            "alg": None,
            "tsa": None,
            "errors": ["Реализация проверки подписи отсутствует"],
            "details": {},
        }
