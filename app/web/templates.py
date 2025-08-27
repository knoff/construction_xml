# app/web/templates.py
from datetime import datetime
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="templates")
templates.env.globals["now"] = datetime.utcnow
