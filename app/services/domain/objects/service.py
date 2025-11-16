from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models_sqlalchemy import DocumentRow, ObjectRow


class ObjectServiceError(Exception):
    """Базовое исключение домена объектов."""

    def __init__(self, detail: str, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class ObjectNotFoundError(ObjectServiceError):
    def __init__(self, object_id: int) -> None:
        super().__init__(f"Объект с идентификатором {object_id} не найден", status_code=404)


class ObjectNameEmptyError(ObjectServiceError):
    def __init__(self) -> None:
        super().__init__("Название объекта не может быть пустым", status_code=400)


class ObjectService:
    """Доменные операции по управлению объектами."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def list_objects(self) -> List[Dict[str, Any]]:
        rows = self._db.query(ObjectRow).order_by(ObjectRow.id.desc()).all()
        return [self._serialize_object(row) for row in rows]

    def create_object(self, name: str) -> Dict[str, Any]:
        name = (name or "").strip()
        if not name:
            raise ObjectNameEmptyError()
        obj = ObjectRow(obj_uid=self._generate_uid(), name=name, created_at=datetime.utcnow())
        self._db.add(obj)
        self._db.commit()
        self._db.refresh(obj)
        return self._serialize_object(obj)

    def get_object(self, object_id: int) -> Dict[str, Any]:
        obj = self._get_object(object_id)
        return self._serialize_object(obj)

    def update_object(self, object_id: int, name: str) -> Dict[str, Any]:
        obj = self._get_object(object_id)
        name = (name or "").strip()
        if not name:
            raise ObjectNameEmptyError()
        obj.name = name
        self._db.commit()
        self._db.refresh(obj)
        return self._serialize_object(obj)

    def delete_object(self, object_id: int, delete_documents: bool) -> Dict[str, Any]:
        obj = self._get_object(object_id)
        if delete_documents:
            self._db.query(DocumentRow).filter(DocumentRow.object_id == object_id).delete(synchronize_session=False)
        self._db.delete(obj)
        self._db.commit()
        return {"deleted": True, "id": object_id}

    def count_documents(self, object_id: int) -> Dict[str, int]:
        self._get_object(object_id)
        count = self._db.query(DocumentRow).filter(DocumentRow.object_id == object_id).count()
        return {"count": count}

    def _get_object(self, object_id: int) -> ObjectRow:
        obj = self._db.get(ObjectRow, object_id)
        if not obj:
            raise ObjectNotFoundError(object_id)
        return obj

    @staticmethod
    def _generate_uid() -> str:
        import uuid

        return uuid.uuid4().hex

    @staticmethod
    def _serialize_object(obj: ObjectRow) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "obj_uid": obj.obj_uid,
            "name": obj.name,
            "created_at": obj.created_at.isoformat() if getattr(obj, "created_at", None) else None,
        }
