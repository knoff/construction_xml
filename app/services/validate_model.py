# app/services/validate_model.py
from __future__ import annotations
from typing import Any, Dict, List
import re

ValidationErrors = Dict[str, List[str]]

def validate_model(state: Any, model: Dict[str, Any]) -> ValidationErrors:
    """
    Server-side validator mirroring the client-side rules:
    - minOccurs/maxOccurs, attributes/children
    - choice
    - facets: pattern, min/maxLength, enum
    - primitive types (number/date/text)
    Returns: {"A.B.0.C": ["msg1","msg2"], ...}
    """
    fields = model.get("root") or []
    types  = model.get("types") or {}
    errors: ValidationErrors = {}

    def k(path): return ".".join(map(str, path))
    def err(path, msg): errors.setdefault(k(path), []).append(msg)
    def is_empty(v): return v is None or (isinstance(v,str) and v.strip()=="")
    def kind_of(dtype):
        if re.fullmatch(r"(xs:)?date", dtype or ""): return "date"
        if re.fullmatch(r"(xs:)?(integer|decimal|float|double|number)", dtype or ""): return "number"
        return "text"
    def occurs(v): return len(v) if isinstance(v,list) else (0 if v is None else 1)
    def resolve(f):
        ref = f.get("refType"); t = types.get(ref) if ref else None
        if t and t.get("kind")=="complexType":
            out = dict(f)
            out.setdefault("documentation", t.get("documentation"))
            out.setdefault("children", t.get("children"))
            out.setdefault("attributes", t.get("attributes"))
            return out
        return f
    def validate_scalar(f, path, v):
        if kind_of(f.get("dtype",""))=="number":
            s = str(v)
            if s != "" and not re.fullmatch(r"-?\d+(\.\d+)?", s):
                err(path, "Число: неверный формат.")
        facets = f.get("facets") or {}
        pat = facets.get("pattern")
        if pat:
            try:
                if not re.compile(pat).search(str(v or "")): err(path, "Не соответствует шаблону.")
            except re.error:
                pass
        if isinstance(v,str):
            ml = facets.get("minLength")
            if ml is not None and len(v)<ml: err(path, f"Минимальная длина {ml}.")
            mx = facets.get("maxLength")
            if mx is not None and len(v)>mx: err(path, f"Максимальная длина {mx}.")
        enum = facets.get("enum") or []
        if enum and str(v) not in list(map(str, enum)):
            err(path, "Недопустимое значение.")
    def visit_children(f, path, v):
        for a in (f.get("attributes") or []):
            av = (v or {}).get(f"@{a.get('name')}")
            visit(a, path+[f"@{a.get('name')}"], av)
        for ch in (f.get("children") or []):
            cv = (v or {}).get(ch.get("name"))
            visit(ch, path+[ch.get("name")], cv)
    def visit(f0, path, v):
        f = resolve(f0)
        mino = f.get("minOccurs",1)
        maxo = float("inf") if f.get("maxOccurs") is None else f.get("maxOccurs",1)
        kind = f.get("kind")
        if kind=="choice":
            if maxo>1 or f.get("maxOccurs") is None:
                cnt = occurs(v)
                if cnt < (mino or 0): err(path, f"Нужно минимум {mino} элемент(ов).")
                if cnt > maxo:        err(path, f"Допустимо максимум {int(maxo) if maxo!=float('inf') else '∞'}.")
                if isinstance(v,list):
                    for idx,item in enumerate(v):
                        if isinstance(item,dict) and item:
                            name = next(iter(item.keys()), None)
                            child = next((c for c in (f.get('children') or []) if c.get('name')==name), None)
                            if child: visit(child, path+[idx,name], item.get(name))
                return
            else:
                if not isinstance(v,dict) or not v:
                    if (mino or 1)>=1: err(path, "Выберите один из вариантов.")
                    return
                name = next(iter(v.keys()), None)
                child = next((c for c in (f.get('children') or []) if c.get('name')==name), None)
                if not child: err(path, "Некорректный выбор варианта."); return
                visit(child, path+[name], v.get(name)); return
        if kind=="attribute" or (f.get("dtype")!="object" and not f.get("children") and not f.get("attributes")):
            if maxo>1 or f.get("maxOccurs") is None:
                cnt = occurs(v)
                if cnt < (mino or 0): err(path, f"Нужно минимум {mino} значений.")
                if cnt > maxo:        err(path, f"Допустимо максимум {int(maxo) if maxo!=float('inf') else '∞'}.")
                if isinstance(v,list):
                    for i,vv in enumerate(v): validate_scalar(f, path+[i], vv)
            else:
                if ((kind=="attribute" and f.get("required")) or ((mino or 1)>=1)) and is_empty(v):
                    err(path, "Обязательное поле.")
                if not is_empty(v): validate_scalar(f, path, v)
            return
        if maxo>1 or f.get("maxOccurs") is None:
            cnt = occurs(v)
            if cnt < (mino or 0): err(path, f"Нужно минимум {mino} элемент(ов).")
            if cnt > maxo:        err(path, f"Допустимо максимум {int(maxo) if maxo!=float('inf') else '∞'}.")
            if isinstance(v,list):
                for i,item in enumerate(v): visit_children(f, path+[i], item)
        else:
            if (mino or 1)>=1 and v is None: err(path, "Обязательный раздел.")
            if v is not None: visit_children(f, path, v)
    for f in fields:
        name = f.get("name")
        visit(f, [name], (state or {}).get(name))
    return errors
