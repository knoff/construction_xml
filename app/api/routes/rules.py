from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.rules import save_rule_yaml

router = APIRouter()

@router.post("/rules")
async def upload_rules(file: UploadFile = File(...)):
    if not file.filename.endswith((".yaml", ".yml")):
        raise HTTPException(status_code=400, detail="Please upload a YAML file")
    content = (await file.read()).decode("utf-8", errors="replace")
    result = save_rule_yaml(content)
    return result