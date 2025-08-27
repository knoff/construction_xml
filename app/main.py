from fastapi import FastAPI, HTTPException, UploadFile, File, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse, JSONResponse
from pathlib import Path
from app.api.routes.health import router as health_router
from app.api.routes.schemas import router as schemas_router
from app.api.routes.schema_types import router as schema_types_router
from app.api.routes.documents import router as documents_router
from app.api.routes.files import router as files_router
from app.api.routes.rules import router as rules_router
from app.api.routes.sign import router as sign_router

app = FastAPI(title="Минстрой XML Service (MVP)")

app.include_router(health_router,       tags=["system"],       prefix="/api")
app.include_router(schemas_router,      tags=["schemas"],      prefix="/api")
app.include_router(schema_types_router, tags=["schema-types"], prefix="/api")
app.include_router(documents_router,    tags=["documents"],    prefix="/api")
app.include_router(files_router,        tags=["files"],        prefix="/api")
app.include_router(rules_router,        tags=["rules"],        prefix="/api")
app.include_router(sign_router,         tags=["sign"],         prefix="/api")

# --- SPA & API separation ---
BASE_DIR = Path(__file__).resolve().parent
SPA_DIR = BASE_DIR / "static"

if SPA_DIR.is_dir():
    app.mount("/ui", StaticFiles(directory=SPA_DIR, html=True), name="ui")
    # опционально оставляем прямой доступ к статике
    app.mount("/static", StaticFiles(directory=SPA_DIR), name="static")
'''
# 1) JSON API под /api/*  (простой роутер для фронта)
api = APIRouter(prefix="/api", tags=["api"])
try:
    # используем существующие сервисы реестра
    from app.services.xsd_registry import list_schemas, save_schema_file  # type: ignore
except Exception:
    list_schemas = None
    save_schema_file = None

@api.get("/schemas")
def api_schemas_list():
    if not callable(list_schemas):
        raise HTTPException(500, "list_schemas() is unavailable")
    return JSONResponse(list_schemas())

@api.post("/schemas/upload")
async def api_schemas_upload(file: UploadFile = File(...)):
    if not callable(save_schema_file):
        raise HTTPException(500, "save_schema_file() is unavailable")
    return JSONResponse(save_schema_file(file))

app.include_router(api)

# 2) SPA раздаём из /ui (без перехвата /api/* и прочих серверных путей)
if SPA_DIR.is_dir():
    # html=True включает fallback на index.html только в префиксе /ui/*
    app.mount("/ui", StaticFiles(directory=SPA_DIR, html=True), name="ui")
    # при желании оставить прямой доступ к ассетам:
    app.mount("/static", StaticFiles(directory=SPA_DIR), name="static")
'''