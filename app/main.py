from fastapi import FastAPI
from app.api.routes.health import router as health_router
from app.api.routes.schemas import router as schemas_router
from app.api.routes.schema_types import router as schema_types_router
from app.api.routes.documents import router as documents_router
from app.api.routes.files import router as files_router
from app.api.routes.rules import router as rules_router
from app.api.routes.sign import router as sign_router

app = FastAPI(title="Минстрой XML Service (MVP)")

app.include_router(health_router, tags=["system"])
app.include_router(schemas_router, tags=["schemas"])
app.include_router(schema_types_router, tags=["schema-types"])
app.include_router(documents_router, tags=["documents"])
app.include_router(files_router, tags=["files"])
app.include_router(rules_router, tags=["rules"])
app.include_router(sign_router, tags=["sign"])