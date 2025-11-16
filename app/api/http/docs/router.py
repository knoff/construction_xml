from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse

router = APIRouter(
    prefix="/api/docs",
    tags=["Документация"],
)

BASE_DIR = Path(__file__).resolve().parents[4]
DOCS_ROOT = BASE_DIR / "docs"
NAVIGATION_FILE = DOCS_ROOT / "_navigation.json"


def _ensure_docs_root_exists() -> None:
    if not DOCS_ROOT.is_dir():
        raise HTTPException(status_code=500, detail="Директория документации недоступна")


def _load_navigation() -> Dict[str, Any]:
    _ensure_docs_root_exists()
    if not NAVIGATION_FILE.is_file():
        raise HTTPException(status_code=404, detail="Файл навигации не найден")
    try:
        with NAVIGATION_FILE.open("r", encoding="utf-8") as fp:
            return json.load(fp)
    except json.JSONDecodeError as exc:  # pragma: no cover - защита от повреждения файла
        raise HTTPException(status_code=500, detail="Файл навигации повреждён") from exc


def _resolve_markdown_path(relative_path: Optional[str]) -> Path:
    _ensure_docs_root_exists()
    if not relative_path:
        relative_path = "README.md"

    normalized = relative_path.lstrip("/\\")
    target = (DOCS_ROOT / normalized).resolve()

    try:
        target.relative_to(DOCS_ROOT)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Недопустимый путь") from exc

    if not target.is_file():
        raise HTTPException(status_code=404, detail="Документ не найден")
    if target.suffix.lower() != ".md":
        raise HTTPException(status_code=400, detail="Поддерживаются только Markdown-файлы")

    return target


@router.get("/navigation")
def get_navigation() -> Dict[str, Any]:
    """Возвращает дерево навигации документации."""

    return _load_navigation()


@router.get("/file")
def get_markdown_file(path: Optional[str] = Query(default=None, description="Относительный путь к Markdown")) -> PlainTextResponse:
    """Возвращает содержимое Markdown-файла."""

    target = _resolve_markdown_path(path)
    content = target.read_text(encoding="utf-8")
    return PlainTextResponse(content, media_type="text/markdown; charset=utf-8")


@router.get("/index")
def get_index() -> PlainTextResponse:
    """Возвращает корневой README документации."""

    target = _resolve_markdown_path("README.md")
    content = target.read_text(encoding="utf-8")
    return PlainTextResponse(content, media_type="text/markdown; charset=utf-8")
