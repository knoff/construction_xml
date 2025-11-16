from __future__ import annotations

from typing import Any, Dict, List
import re

ValidationErrors = Dict[str, List[str]]


def validate_model(state: Any, model: Dict[str, Any]) -> ValidationErrors:
    """Валидация документа согласно внутренней модели XSD."""

    fields = model.get("root") or []
    types = model.get("types") or {}
    errors: ValidationErrors = {}

    def k(path):
        return ".".join(map(str, path))

    def err(path, msg):
        errors.setdefault(k(path), []).append(msg)

    def is_empty(value):
        return value is None or (isinstance(value, str) and value.strip() == "")

    def kind_of(dtype):
        if re.fullmatch(r"(xs:)?date", dtype or ""):
            return "date"
        if re.fullmatch(r"(xs:)?(integer|decimal|float|double|number)", dtype or ""):
            return "number"
        return "text"

    def occurs(value):
        return len(value) if isinstance(value, list) else (0 if value is None else 1)

    def resolve(field):
        ref = field.get("refType")
        type_def = types.get(ref) if ref else None
        if type_def and type_def.get("kind") == "complexType":
            merged = dict(field)
            merged.setdefault("documentation", type_def.get("documentation"))
            merged.setdefault("children", type_def.get("children"))
            merged.setdefault("attributes", type_def.get("attributes"))
            return merged
        return field

    def validate_scalar(field, path, value):
        if kind_of(field.get("dtype", "")) == "number":
            string_value = str(value)
            if string_value != "" and not re.fullmatch(r"-?\d+(\.\d+)?", string_value):
                err(path, "Число: неверный формат.")
        facets = field.get("facets") or {}
        pattern = facets.get("pattern")
        if pattern:
            try:
                if not re.compile(pattern).search(str(value or "")):
                    err(path, "Не соответствует шаблону.")
            except re.error:
                pass
        if isinstance(value, str):
            min_length = facets.get("minLength")
            if min_length is not None and len(value) < min_length:
                err(path, f"Минимальная длина {min_length}.")
            max_length = facets.get("maxLength")
            if max_length is not None and len(value) > max_length:
                err(path, f"Максимальная длина {max_length}.")
        enum = facets.get("enum") or []
        if enum and str(value) not in list(map(str, enum)):
            err(path, "Недопустимое значение.")

    def visit_children(field, path, value):
        for attribute in field.get("attributes") or []:
            attribute_value = (value or {}).get(f"@{attribute.get('name')}")
            visit(attribute, path + [f"@{attribute.get('name')}"] , attribute_value)
        for child in field.get("children") or []:
            child_value = (value or {}).get(child.get("name"))
            visit(child, path + [child.get("name")], child_value)

    def visit(field_def, path, value):
        field = resolve(field_def)
        min_occurs = field.get("minOccurs", 1)
        max_occurs = float("inf") if field.get("maxOccurs") is None else field.get("maxOccurs", 1)
        kind = field.get("kind")

        if kind == "choice":
            if max_occurs > 1 or field.get("maxOccurs") is None:
                count = occurs(value)
                if count < (min_occurs or 0):
                    err(path, f"Нужно минимум {min_occurs} элемент(ов).")
                if count > max_occurs:
                    err(path, f"Допустимо максимум {int(max_occurs) if max_occurs != float('inf') else '∞'}.")
                if isinstance(value, list):
                    for idx, item in enumerate(value):
                        if isinstance(item, dict) and item:
                            name = next(iter(item.keys()), None)
                            child = next((c for c in field.get("children") or [] if c.get("name") == name), None)
                            if child:
                                visit(child, path + [idx, name], item.get(name))
                return
            else:
                if not isinstance(value, dict) or not value:
                    if (min_occurs or 1) >= 1:
                        err(path, "Выберите один из вариантов.")
                    return
                name = next(iter(value.keys()), None)
                child = next((c for c in field.get("children") or [] if c.get("name") == name), None)
                if not child:
                    err(path, "Некорректный выбор варианта.")
                    return
                visit(child, path + [name], value.get(name))
                return

        is_simple = kind == "attribute" or (
            field.get("dtype") != "object"
            and not field.get("children")
            and not field.get("attributes")
        )

        if is_simple:
            if max_occurs > 1 or field.get("maxOccurs") is None:
                count = occurs(value)
                if count < (min_occurs or 0):
                    err(path, f"Нужно минимум {min_occurs} значений.")
                if count > max_occurs:
                    err(path, f"Допустимо максимум {int(max_occurs) if max_occurs != float('inf') else '∞'}.")
                if isinstance(value, list):
                    for index, item in enumerate(value):
                        validate_scalar(field, path + [index], item)
            else:
                required = (kind == "attribute" and field.get("required")) or (min_occurs or 1) >= 1
                if required and is_empty(value):
                    err(path, "Обязательное поле.")
                if not is_empty(value):
                    validate_scalar(field, path, value)
            return

        if max_occurs > 1 or field.get("maxOccurs") is None:
            count = occurs(value)
            if count < (min_occurs or 0):
                err(path, f"Нужно минимум {min_occurs} элемент(ов).")
            if count > max_occurs:
                err(path, f"Допустимо максимум {int(max_occurs) if max_occurs != float('inf') else '∞'}.")
            if isinstance(value, list):
                for index, item in enumerate(value):
                    visit_children(field, path + [index], item)
        else:
            if (min_occurs or 1) >= 1 and value is None:
                err(path, "Обязательный раздел.")
            if value is not None:
                visit_children(field, path, value)

    for field in fields:
        name = field.get("name")
        visit(field, [name], (state or {}).get(name))

    return errors
