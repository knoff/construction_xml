from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from pathlib import Path
from app.api.http.schemas import router as schemas_router, legacy_router as legacy_schemas_router
from app.api.http.documents import router as documents_router, legacy_router as legacy_documents_router
from app.api.routes.health import router as health_router
from app.api.http.objects import router as objects_router, legacy_router as legacy_objects_router
from app.api.http.document_versions import router as doc_versions_router, legacy_router as legacy_doc_versions_router
from app.api.http.files import router as files_router, legacy_router as legacy_files_router
from app.api.http.sign import router as sign_router, legacy_router as legacy_sign_router
from app.api.http.value_links import (
    router as value_links_router,
    locks_router as value_locks_router,
    legacy_router as legacy_value_links_router,
    legacy_locks_router as legacy_value_locks_router,
)

app = FastAPI(title="Минстрой XML Service (MVP)")

app.include_router(health_router, tags=["system"], prefix="/api")
app.include_router(schemas_router)
app.include_router(objects_router)
app.include_router(documents_router)
app.include_router(doc_versions_router)
app.include_router(files_router)
app.include_router(sign_router)
app.include_router(value_links_router)
app.include_router(value_locks_router)
app.include_router(legacy_schemas_router, tags=["schemas"], prefix="/api")
app.include_router(legacy_documents_router, tags=["documents"], prefix="/api")
app.include_router(legacy_doc_versions_router, tags=["documents"], prefix="/api")
app.include_router(legacy_files_router,    tags=["files"],    prefix="/api")
app.include_router(legacy_objects_router,  tags=["objects"],  prefix="/api")
app.include_router(legacy_sign_router,     tags=["sign"],        prefix="/api")
app.include_router(legacy_value_links_router, tags=["value-links"], prefix="/api")
app.include_router(legacy_value_locks_router, tags=["value-locks"], prefix="/api")

# --- Разделение SPA и API ---
BASE_DIR = Path(__file__).resolve().parent
SPA_DIR = BASE_DIR / "static"

if SPA_DIR.is_dir():
    # Отдаём ассеты Vite по /ui/assets/*
    assets_dir = SPA_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/ui/assets", StaticFiles(directory=assets_dir), name="ui-assets")
    # (по желанию) общий прямой доступ, если использовался ранее
    app.mount("/static", StaticFiles(directory=SPA_DIR), name="static")

# SPA fallback: для любых /ui/* отдаём index.html, чтобы React Router обработал маршрут
@app.get("/ui", include_in_schema=False)
@app.get("/ui/{path:path}", include_in_schema=False)
def spa_catch_all(path: str = ""):
    if not SPA_DIR.is_dir():
        raise HTTPException(404, "UI is not built")
    index_file = SPA_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(404, "index.html is missing in SPA_DIR")
    return FileResponse(index_file)

# redirect root → /ui
@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/ui")