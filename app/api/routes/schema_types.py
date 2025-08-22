from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.db import get_db
from app.models_sqlalchemy import SchemaType

router = APIRouter(prefix="/schema-types", tags=["schema-types"])
from app.web.templates import templates

@router.get("/", response_class=HTMLResponse)
def list_types(request: Request, db: Session = Depends(get_db)):
    items = db.query(SchemaType).order_by(SchemaType.id.asc()).all()
    flash = request.query_params.get("msg")
    return templates.TemplateResponse("schema_types/list.html", {"request": request, "items": items, "flash": flash})

@router.get("/new", response_class=HTMLResponse)
def new_form(request: Request):
    return templates.TemplateResponse("schema_types/form.html", {"request": request, "item": None})

@router.post("/new")
def create_type(
    code: str = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    filename_pattern: str = Form(""),
    db: Session = Depends(get_db),
):
    if db.query(SchemaType).filter_by(code=code).first():
        raise HTTPException(status_code=400, detail="Тип с таким code уже существует")
    now = datetime.utcnow()
    st = SchemaType(
        code=code.strip(),
        title=title.strip(),
        description=description.strip() or None,
        filename_pattern=filename_pattern.strip() or None,
        created_at=now,
        updated_at=now,
    )
    db.add(st)
    db.commit()
    return RedirectResponse("/schema-types?msg=Тип%20создан", status_code=303)

@router.get("/{type_id}", response_class=HTMLResponse)
def edit_form(type_id: int, request: Request, db: Session = Depends(get_db)):
    st = db.get(SchemaType, type_id)
    if not st:
        raise HTTPException(status_code=404, detail="Тип не найден")
    return templates.TemplateResponse("schema_types/form.html", {"request": request, "item": st})

@router.post("/{type_id}/save")
def update_type(
    type_id: int,
    code: str = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    filename_pattern: str = Form(""),
    db: Session = Depends(get_db),
):
    st = db.get(SchemaType, type_id)
    if not st:
        raise HTTPException(status_code=404, detail="Тип не найден")
    st.code = code.strip()
    st.title = title.strip()
    st.description = description.strip() or None
    st.filename_pattern = filename_pattern.strip() or None
    st.updated_at = datetime.utcnow()
    db.commit()
    return RedirectResponse("/schema-types?msg=Тип%20обновлён", status_code=303)

@router.post("/{type_id}/delete")
def delete_type(type_id: int, db: Session = Depends(get_db)):
    st = db.get(SchemaType, type_id)
    if not st:
        raise HTTPException(status_code=404, detail="Тип не найден")
    db.delete(st)
    db.commit()
    return RedirectResponse("/schema-types?msg=Тип%20удалён", status_code=303)
