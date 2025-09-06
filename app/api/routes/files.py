from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body, Form
from sqlalchemy.orm import Session
from typing import Optional
import hashlib, mimetypes, zlib
from app.db import get_db
from app.models_sqlalchemy import FileRow, ObjectRow, FileSignatureRow
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
    row = FileRow(
        object_id=object_id,
        storage_path=path, mime=mime, size=len(content),
        sha256=sha, crc32=crc, original_name=f.filename,
    )
    db.add(row); db.commit(); db.refresh(row)
    return {
        "id": row.id, "object_id": row.object_id, "original_name": row.original_name,
        "mime": row.mime, "size": row.size, "sha256": row.sha256, "crc32": row.crc32,
        "storage_path": row.storage_path, "created_at": row.created_at.isoformat()
    }

@router.get("/{file_id}", response_model=dict)
def get_file(file_id:int, db: Session = Depends(get_db)):
    r = db.get(FileRow, file_id)
    if not r or r.is_deleted: raise HTTPException(404, "Файл не найден")
    return {
        "id": r.id, "object_id": r.object_id,
        "original_name": r.original_name, "title": r.title, "doc_number": r.doc_number,
        "doc_date": r.doc_date, "author": r.author, "doc_type": r.doc_type, "group": r.group,
        "mime": r.mime, "size": r.size, "sha256": r.sha256, "crc32": r.crc32,
        "storage_path": r.storage_path, "created_at": r.created_at.isoformat()
    }

@router.patch("/{file_id}", response_model=dict)
def patch_file(file_id:int, data:dict = Body(...), db: Session = Depends(get_db)):
    r = db.get(FileRow, file_id)
    if not r or r.is_deleted: raise HTTPException(404, "Файл не найден")
    for k in ["title", "doc_number", "doc_date", "author", "doc_type", "group"]:
        if k in data: setattr(r, k, data[k])
    # перенос между объектами (опционально)
    if "object_id" in data:
        if data["object_id"] is not None and not db.get(ObjectRow, data["object_id"]):
            raise HTTPException(404, "Объект не найден")
        r.object_id = data["object_id"]
    db.commit(); db.refresh(r)
    return {"ok": True, "id": r.id}

@router.delete("/{file_id}", response_model=dict)
def delete_file(file_id:int, db: Session = Depends(get_db)):
    """
    Мягкое удаление: помечаем is_deleted = True.
    Плюс пытаемся удалить бинарь из MinIO (если известен storage_path).
    """
    r = db.get(FileRow, file_id)
    if not r or getattr(r, "is_deleted", False):
        raise HTTPException(404, "Файл не найден")
    # пробуем удалить бинарь
    key = getattr(r, "storage_path", None) or getattr(r, "file_path", None)
    if key:
        try:
            delete_file_minio(key)
        except Exception:
            # не критично для мягкого удаления
            pass
    # помечаем удалённым
    if hasattr(r, "is_deleted"):
        r.is_deleted = True
    db.commit()
    return {"ok": True, "deleted": True, "id": r.id}

@router.get("/objects/{object_id}", response_model=list[dict])
def list_object_files(object_id:int, db: Session = Depends(get_db)):
    obj = db.get(ObjectRow, object_id)
    if not obj: raise HTTPException(404, "Объект не найден")
    rows = db.query(FileRow).filter(FileRow.object_id==object_id, FileRow.is_deleted==False).order_by(FileRow.id.desc()).all()
    return [{
        "id": f.id, "original_name": f.original_name, "title": f.title, "doc_number": f.doc_number,
        "doc_date": f.doc_date, "author": f.author, "doc_type": f.doc_type, "group": f.group,
        "mime": f.mime, "size": f.size, "sha256": f.sha256, "crc32": f.crc32
    } for f in rows]

@router.post("/{file_id}/signatures", response_model=dict)
async def attach_signature(file_id:int, sig: UploadFile = File(...), db: Session = Depends(get_db)):
    base = db.get(FileRow, file_id)
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
    sig_row = FileRow(object_id=base.object_id, storage_path=path, mime=mime, size=len(content),
                      sha256=sha, crc32=crc, original_name=sig.filename, doc_type="signature")
    db.add(sig_row); db.commit(); db.refresh(sig_row)
    link = FileSignatureRow(file_id=base.id, sig_file_id=sig_row.id, algo=None)
    db.add(link); db.commit()
    return {"ok": True, "file_id": base.id, "sig_id": sig_row.id}