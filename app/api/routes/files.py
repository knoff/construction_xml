from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body, Form
from sqlalchemy.orm import Session
from typing import Optional
import hashlib, mimetypes, zlib
from app.db import get_db
from app.models_sqlalchemy import FileRow, FileVersionRow, ObjectRow, FileSignatureRow
from sqlalchemy.orm import selectinload
from app.storage import save_file_minio_key, save_file_minio, delete_file_minio
from botocore.exceptions import ClientError
from datetime import datetime

router = APIRouter(prefix="/files", tags=["files"])

def _crc32_hex(content: bytes) -> str:
    return format(zlib.crc32(content) & 0xFFFFFFFF, "08X")

def _safe_ext(filename: str, fallback: str = "") -> str:
    # оставляем только безопасное короткое расширение
    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "").strip()
    if not ext and fallback:
        ext = fallback
    # ограничим до 8 символов на всякий случай
    return ext[:8]

def _storage_key(sha: str, ext: str | None = None) -> str:
    # максимально короткий иерархический путь; длина ~ 2 + 1 + 64 + 1 + len(ext) + префикс
    # префикс держим минимальным: "f/"
    return f"f/{sha[:2]}/{sha}" + (f".{ext}" if ext else "")


# Создать «логический файл» c первой версией (загрузка)
@router.post("", response_model=dict)
async def upload_file(
    object_id: int = Form(...),                   # <- читаем И ОБЯЗАТЕЛЕН из multipart/form-data
    f: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    content = await f.read()
    if not content:
        raise HTTPException(400, "Пустой файл")
    # Привязка обязательна: объект должен существовать
    if not db.get(ObjectRow, object_id):
        raise HTTPException(404, "Объект не найден")
    sha = hashlib.sha256(content).hexdigest()
    crc = _crc32_hex(content)
    mime = f.content_type or mimetypes.guess_type(f.filename)[0] or "application/octet-stream"
    ext = _safe_ext(f.filename, "bin")
    path = _storage_key(sha, ext)  # короткий ключ: f/aa/<sha>.ext
    try:
        # жёстко сохраняем по нашему короткому ключу и с правильным ContentType
        save_file_minio_key(path, content, mime)
    except ClientError as e:
        # Прокидываем понятную 400-ошибку на фронт
        code = e.response.get("Error", {}).get("Code", "S3Error")
        msg = e.response.get("Error", {}).get("Message", str(e))
        raise HTTPException(status_code=400, detail=f"{code}: {msg}")
    file_row = FileRow(object_id=object_id)  # общие метаданные можно заполнить позже PATCH'ем
    db.add(file_row); db.flush()
    ver = FileVersionRow(
        file_id=file_row.id,
        storage_path=path, original_name=f.filename, mime=mime, size=len(content),
        sha256=sha, crc32=crc, created_at=datetime.utcnow()
    )
    db.add(ver); db.commit(); db.refresh(file_row); db.refresh(ver)
    return {
        "id": file_row.id, "object_id": file_row.object_id,
        "version": {
            "id": ver.id, "original_name": ver.original_name, "mime": ver.mime, "size": ver.size,
            "sha256": ver.sha256, "crc32": ver.crc32, "storage_path": ver.storage_path,
            "created_at": ver.created_at.isoformat(),
        }
    }

# Получить «логический файл» + кратко последнюю версию
@router.get("/{file_id}", response_model=dict)
def get_file(file_id:int, db: Session = Depends(get_db)):
    r = db.get(FileRow, file_id)
    if not r or r.is_deleted: raise HTTPException(404, "Файл не найден")
    ver = (
        db.query(FileVersionRow)
          .filter_by(file_id=file_id, is_deleted=False)
          .order_by(FileVersionRow.created_at.desc())
          .first()
    )
    out = {
        "id": r.id, "object_id": r.object_id,
        "title": r.title, "doc_number": r.doc_number, "doc_date": r.doc_date,
        "author": r.author, "doc_type": r.doc_type, "group": r.group,
        "created_at": r.created_at.isoformat(),
    }
    if ver:
        out["version"] = {
            "id": ver.id, "original_name": ver.original_name, "mime": ver.mime, "size": ver.size,
            "sha256": ver.sha256, "crc32": ver.crc32, "storage_path": ver.storage_path,
            "created_at": ver.created_at.isoformat(),
        }
    return out

@router.patch("/{file_id}", response_model=dict)
def patch_file(file_id:int, data:dict = Body(...), db: Session = Depends(get_db)):
    r = db.get(FileRow, file_id)
    if not r or r.is_deleted: raise HTTPException(404, "Файл не найден")
    for k in ["title", "doc_number", "doc_date", "author", "doc_type", "group", "object_id"]:
        if k in data: setattr(r, k, data[k])
    # перенос между объектами (опционально)
    if "object_id" in data:
        if data["object_id"] is not None and not db.get(ObjectRow, data["object_id"]):
            raise HTTPException(404, "Объект не найден")
        r.object_id = data["object_id"]
    db.commit(); db.refresh(r)
    return {"ok": True, "id": r.id}

# Удалить файл целиком: пометить файл и ВСЕ его версии, удалить бинарь у версий
@router.delete("/{file_id}", response_model=dict)
def delete_file(file_id:int, db: Session = Depends(get_db)):
    """
    Мягкое удаление: помечаем is_deleted = True.
    Плюс пытаемся удалить бинарь из MinIO (если известен storage_path).
    """
    r = db.get(FileRow, file_id)
    if not r or getattr(r, "is_deleted", False):
        raise HTTPException(404, "Файл не найден")
    r.is_deleted = True
    # удаляем бинарь у всех живых версий и помечаем их удалёнными
    vers = db.query(FileVersionRow).filter_by(file_id=file_id, is_deleted=False).all()
    for v in vers:
        if v.storage_path:
            try: delete_file_minio(v.storage_path)
            except Exception: pass
        v.is_deleted = True
    db.commit()
    return {"ok": True, "deleted": True, "id": r.id}

# Список версий
@router.get("/{file_id}/versions", response_model=list[dict])
def list_versions(file_id:int, db: Session = Depends(get_db)):
    f = db.get(FileRow, file_id)
    if not f or f.is_deleted: raise HTTPException(404, "Файл не найден")
    vers = sorted((f.versions or []), key=lambda v: v.created_at or datetime.min, reverse=True)
    # найдём актуальную (последняя НЕудалённая)
    latest_alive = None
    for v in vers:
        if not getattr(v, "is_deleted", False):
            latest_alive = v.id
            break
    return [{
        "id": v.id, "original_name": v.original_name, "mime": v.mime, "size": v.size,
        "sha256": v.sha256, "crc32": v.crc32, "storage_path": v.storage_path,
        "created_at": v.created_at.isoformat() if v.created_at else None,
        "is_deleted": v.is_deleted,
        "is_latest": (v.id == latest_alive),
    } for v in vers]

# Создать новую версию
@router.post("/{file_id}/versions", response_model=dict)
async def create_version(file_id:int, f: UploadFile = File(...), db: Session = Depends(get_db)):
    base = db.get(FileRow, file_id)
    if not base or base.is_deleted: raise HTTPException(404, "Файл не найден")
    content = await f.read()
    if not content: raise HTTPException(400, "Пустой файл")
    sha = hashlib.sha256(content).hexdigest()
    crc = _crc32_hex(content)
    mime = f.content_type or mimetypes.guess_type(f.filename)[0] or "application/octet-stream"
    ext = _safe_ext(f.filename, "bin")
    path = _storage_key(sha, ext)
    try:
        save_file_minio_key(path, content, mime)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "S3Error")
        msg = e.response.get("Error", {}).get("Message", str(e))
        raise HTTPException(status_code=400, detail=f"{code}: {msg}")
    ver = FileVersionRow(
        file_id=file_id, storage_path=path, original_name=f.filename,
        mime=mime, size=len(content), sha256=sha, crc32=crc, created_at=datetime.utcnow()
    )
    db.add(ver); db.commit(); db.refresh(ver)
    return {"id": ver.id}

# Удалить конкретную версию
@router.delete("/versions/{version_id}", response_model=dict)
def delete_version(version_id:int, db: Session = Depends(get_db)):
    v = db.get(FileVersionRow, version_id)
    if not v or v.is_deleted: raise HTTPException(404, "Версия не найдена")
    try:
        if v.storage_path: delete_file_minio(v.storage_path)
    except Exception:
        pass
    v.is_deleted = True
    db.commit()
    return {"ok": True}

@router.get("/objects/{object_id}", response_model=list[dict])
def list_object_files(object_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(FileRow)
          .options(selectinload(FileRow.versions))
          .filter(FileRow.object_id == object_id, FileRow.is_deleted == False)
          .order_by(FileRow.created_at.desc())
          .all()
    )
    return [{
        "id": f.id,
        "title": f.title, "doc_number": f.doc_number, "doc_date": f.doc_date,
        "author": f.author, "doc_type": f.doc_type, "group": f.group,
        # поля последней НЕудалённой версии (проксируются через модель)
        "original_name": f.filename,
        "mime": f.mime, "size": f.size, "sha256": f.sha256, "crc32": f.crc32,
        "storage_path": f.storage_path,
        # счётчик версий (по умолчанию считаем неудалённые)
        "versions_count": sum(1 for v in (f.versions or []) if not getattr(v, "is_deleted", False)),
        "created_at": (f.created_at.isoformat() if getattr(f, "created_at", None) else None),
    } for f in rows]

# Подпись .sig теперь привязываем к версии
@router.post("/versions/{version_id}/signatures", response_model=dict)
async def attach_signature(version_id:int, sig: UploadFile = File(...), db: Session = Depends(get_db)):
    base = db.get(FileVersionRow, version_id)
    if not base or base.is_deleted: raise HTTPException(404, "Исходный файл не найден")
    content = await sig.read()
    if not content: raise HTTPException(400, "Пустая подпись")
    if not (sig.filename.endswith(".sig")):
        raise HTTPException(400, "Ожидается .sig")
    sha = hashlib.sha256(content).hexdigest()
    crc = _crc32_hex(content)
    mime = sig.content_type or "application/octet-stream"
    ext = _safe_ext(sig.filename, "sig")
    path = _storage_key(sha, ext)
    try:
        save_file_minio_key(path, content, mime)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "S3Error")
        msg = e.response.get("Error", {}).get("Message", str(e))
        raise HTTPException(status_code=400, detail=f"{code}: {msg}")
    # .sig можно хранить отдельной FileRow как сейчас (или в отдельной таблице) — оставим как есть:
    sig_row = FileRow(object_id=base.file.object_id)
    db.add(sig_row); db.flush()
    sig_ver = FileVersionRow(
        file_id=sig_row.id, storage_path=path, original_name=sig.filename,
        mime=mime, size=len(content), sha256=sha, crc32=crc, created_at=datetime.utcnow()
    )
    db.add(sig_ver); db.commit(); db.refresh(sig_ver)
    link = FileSignatureRow(file_version_id=base.id, sig_file_id=sig_row.id, algo=None)
    db.add(link); db.commit()
    return {"ok": True, "file_id": base.id, "sig_id": sig_row.id}