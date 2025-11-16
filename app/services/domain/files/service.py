from __future__ import annotations

import hashlib
import mimetypes
import zlib
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from botocore.exceptions import ClientError
from sqlalchemy.orm import Session, joinedload

from app.models_sqlalchemy import FileRow, FileVersionRow, FileSignatureRow, ObjectRow
from app.storage import delete_file_minio, save_file_minio_key


class FileServiceError(Exception):
    """Базовое исключение домена файлов."""

    def __init__(self, detail: str, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class FileNotFoundError(FileServiceError):
    def __init__(self, file_id: int) -> None:
        super().__init__(f"Файл с идентификатором {file_id} не найден", status_code=404)


class FileVersionNotFoundError(FileServiceError):
    def __init__(self, version_id: int) -> None:
        super().__init__(f"Версия файла с идентификатором {version_id} не найдена", status_code=404)


class ObjectNotFoundError(FileServiceError):
    def __init__(self, object_id: int) -> None:
        super().__init__(f"Объект с идентификатором {object_id} не найден", status_code=404)


class EmptyFileError(FileServiceError):
    def __init__(self) -> None:
        super().__init__("Загруженный файл пуст", status_code=400)


class InvalidSignatureError(FileServiceError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail, status_code=400)


class StorageError(FileServiceError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail, status_code=400)


class FileService:
    """Доменные операции с файловым хранилищем."""

    def __init__(self, db: Session) -> None:
        self._db = db

    # ------------------------ Публичные операции ------------------------

    def upload_file(
        self,
        *,
        object_id: int,
        filename: str,
        content_type: Optional[str],
        content: bytes,
    ) -> Dict[str, Any]:
        if not content:
            raise EmptyFileError()

        obj = self._db.get(ObjectRow, object_id)
        if not obj:
            raise ObjectNotFoundError(object_id)

        file_row = FileRow(object_id=object_id)
        self._db.add(file_row)
        self._db.flush()

        version_row = self._create_version_row(file_row.id, filename, content_type, content)
        self._db.add(version_row)
        self._db.commit()
        self._db.refresh(file_row)
        self._db.refresh(version_row)

        return self._serialize_upload(file_row, version_row)

    def get_file(self, file_id: int) -> Dict[str, Any]:
        file_row = self._get_file(file_id)
        return self._serialize_file(file_row)

    def patch_file(self, file_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        file_row = self._get_file(file_id)
        for field in ("title", "doc_number", "doc_date", "author", "doc_type", "group"):
            if field in payload and payload[field] is not None:
                setattr(file_row, field, payload[field])
        if "object_id" in payload:
            new_object_id = payload["object_id"]
            if new_object_id is not None:
                obj = self._db.get(ObjectRow, new_object_id)
                if not obj:
                    raise ObjectNotFoundError(new_object_id)
            file_row.object_id = new_object_id
        self._db.commit()
        self._db.refresh(file_row)
        return self._serialize_file(file_row)

    def delete_file(self, file_id: int) -> Dict[str, Any]:
        file_row = self._get_file(file_id)
        if getattr(file_row, "is_deleted", False):
            raise FileNotFoundError(file_id)
        file_row.is_deleted = True
        versions = self._db.query(FileVersionRow).filter_by(file_id=file_id, is_deleted=False).all()
        for version in versions:
            if version.storage_path:
                try:
                    delete_file_minio(version.storage_path)
                except Exception:
                    pass
            version.is_deleted = True
        self._db.commit()
        return {"ok": True, "deleted": True, "id": file_id}

    def list_versions(self, file_id: int) -> List[Dict[str, Any]]:
        file_row = self._get_file(file_id)
        versions = sorted(
            (file_row.versions or []),
            key=lambda v: v.created_at or datetime.min,
            reverse=True,
        )
        latest_alive_id = None
        for version in versions:
            if not getattr(version, "is_deleted", False):
                latest_alive_id = version.id
                break
        return [self._serialize_version(v, latest_alive_id=latest_alive_id) for v in versions]

    def create_version(
        self,
        file_id: int,
        *,
        filename: str,
        content_type: Optional[str],
        content: bytes,
    ) -> Dict[str, Any]:
        if not content:
            raise EmptyFileError()
        file_row = self._get_file(file_id)
        if getattr(file_row, "is_deleted", False):
            raise FileNotFoundError(file_id)
        version_row = self._create_version_row(file_row.id, filename, content_type, content)
        self._db.add(version_row)
        self._db.commit()
        self._db.refresh(version_row)
        return self._serialize_version(version_row)

    def delete_version(self, version_id: int) -> Dict[str, Any]:
        version = self._db.get(FileVersionRow, version_id)
        if not version or getattr(version, "is_deleted", False):
            raise FileVersionNotFoundError(version_id)
        if version.storage_path:
            try:
                delete_file_minio(version.storage_path)
            except Exception:
                pass
        version.is_deleted = True
        self._db.commit()
        return {"ok": True}

    def list_object_files(self, object_id: int) -> List[Dict[str, Any]]:
        rows = (
            self._db.query(FileRow)
            .options(joinedload(FileRow.versions))
            .filter(FileRow.object_id == object_id, FileRow.is_deleted == False)  # noqa: E712
            .order_by(FileRow.created_at.desc())
            .all()
        )
        return [self._serialize_file_list_item(row) for row in rows]

    def attach_signature(
        self,
        version_id: int,
        *,
        filename: str,
        content_type: Optional[str],
        content: bytes,
    ) -> Dict[str, Any]:
        if not content:
            raise EmptyFileError()
        if not filename.endswith(".sig"):
            raise InvalidSignatureError("Ожидается файл с расширением .sig")

        base_version = self._db.get(FileVersionRow, version_id)
        if not base_version or getattr(base_version, "is_deleted", False):
            raise FileVersionNotFoundError(version_id)

        sig_row = FileRow(object_id=base_version.file.object_id if base_version.file else None)
        self._db.add(sig_row)
        self._db.flush()

        sig_version = self._create_version_row(sig_row.id, filename, content_type, content)
        self._db.add(sig_version)
        self._db.commit()
        self._db.refresh(sig_version)

        link = FileSignatureRow(file_version_id=base_version.id, sig_file_id=sig_row.id, algo=None)
        self._db.add(link)
        self._db.commit()

        return {"ok": True, "file_id": base_version.id, "sig_id": sig_row.id}

    # ------------------------ Внутренние помощники ------------------------

    def _get_file(self, file_id: int) -> FileRow:
        file_row = (
            self._db.query(FileRow)
            .options(joinedload(FileRow.versions))
            .filter(FileRow.id == file_id)
            .first()
        )
        if not file_row or getattr(file_row, "is_deleted", False):
            raise FileNotFoundError(file_id)
        return file_row

    def _create_version_row(
        self,
        file_id: int,
        filename: str,
        content_type: Optional[str],
        content: bytes,
    ) -> FileVersionRow:
        sha = hashlib.sha256(content).hexdigest()
        crc = self._crc32_hex(content)
        mime = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        ext = self._safe_ext(filename, "bin")
        storage_path = self._storage_key(sha, ext)
        try:
            save_file_minio_key(storage_path, content, mime)
        except ClientError as exc:
            raise StorageError(self._format_storage_error(exc)) from exc
        return FileVersionRow(
            file_id=file_id,
            storage_path=storage_path,
            original_name=filename,
            mime=mime,
            size=len(content),
            sha256=sha,
            crc32=crc,
            created_at=datetime.utcnow(),
        )

    @staticmethod
    def _serialize_upload(file_row: FileRow, version_row: FileVersionRow) -> Dict[str, Any]:
        return {
            "id": file_row.id,
            "object_id": file_row.object_id,
            "version": FileService._serialize_version(version_row),
        }

    def _serialize_file(self, file_row: FileRow) -> Dict[str, Any]:
        latest_version = self._latest_version(file_row.versions or [])
        return {
            "id": file_row.id,
            "object_id": file_row.object_id,
            "title": getattr(file_row, "title", None),
            "doc_number": getattr(file_row, "doc_number", None),
            "doc_date": getattr(file_row, "doc_date", None),
            "author": getattr(file_row, "author", None),
            "doc_type": getattr(file_row, "doc_type", None),
            "group": getattr(file_row, "group", None),
            "created_at": self._iso(getattr(file_row, "created_at", None)),
            "version": self._serialize_version(latest_version) if latest_version else None,
        }

    def _serialize_version(
        self,
        version: Optional[FileVersionRow],
        *,
        latest_alive_id: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        if version is None:
            return None
        return {
            "id": version.id,
            "original_name": version.original_name,
            "mime": version.mime,
            "size": version.size,
            "sha256": version.sha256,
            "crc32": version.crc32,
            "storage_path": version.storage_path,
            "created_at": self._iso(version.created_at),
            "is_deleted": getattr(version, "is_deleted", False),
            "is_latest": latest_alive_id is not None and version.id == latest_alive_id,
        }

    def _serialize_file_list_item(self, file_row: FileRow) -> Dict[str, Any]:
        latest_version = self._latest_version(file_row.versions or [])
        versions_count = sum(1 for v in (file_row.versions or []) if not getattr(v, "is_deleted", False))
        return {
            "id": file_row.id,
            "title": getattr(file_row, "title", None),
            "doc_number": getattr(file_row, "doc_number", None),
            "doc_date": getattr(file_row, "doc_date", None),
            "author": getattr(file_row, "author", None),
            "doc_type": getattr(file_row, "doc_type", None),
            "group": getattr(file_row, "group", None),
            "original_name": latest_version.original_name if latest_version else None,
            "mime": latest_version.mime if latest_version else None,
            "size": latest_version.size if latest_version else None,
            "sha256": latest_version.sha256 if latest_version else None,
            "crc32": latest_version.crc32 if latest_version else None,
            "storage_path": latest_version.storage_path if latest_version else None,
            "versions_count": versions_count,
            "created_at": self._iso(getattr(file_row, "created_at", None)),
        }

    @staticmethod
    def _latest_version(versions: Iterable[FileVersionRow]) -> Optional[FileVersionRow]:
        alive = [v for v in versions if not getattr(v, "is_deleted", False)]
        pool = alive if alive else list(versions)
        if not pool:
            return None
        return max(pool, key=lambda v: v.created_at or datetime.min)

    @staticmethod
    def _safe_ext(filename: str, fallback: str = "") -> str:
        ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "").strip()
        if not ext and fallback:
            ext = fallback
        return ext[:8]

    @staticmethod
    def _storage_key(sha: str, ext: Optional[str] = None) -> str:
        return f"f/{sha[:2]}/{sha}" + (f".{ext}" if ext else "")

    @staticmethod
    def _crc32_hex(content: bytes) -> str:
        return format(zlib.crc32(content) & 0xFFFFFFFF, "08X")

    @staticmethod
    def _iso(dt: Optional[datetime]) -> Optional[str]:
        return dt.isoformat() if dt else None

    @staticmethod
    def _format_storage_error(exc: ClientError) -> str:
        code = exc.response.get("Error", {}).get("Code", "S3Error")
        message = exc.response.get("Error", {}).get("Message", str(exc))
        return f"{code}: {message}"
