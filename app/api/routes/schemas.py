from fastapi import APIRouter, UploadFile, File
from app.services.xsd_registry import list_schemas, save_schema_file

router = APIRouter()

@router.get("/schemas")
def get_schemas():
    return list_schemas()

@router.post("/schemas/upload")
async def upload_schema(file: UploadFile = File(...)):
    content = await file.read()
    saved = save_schema_file(file.filename, content)
    return saved