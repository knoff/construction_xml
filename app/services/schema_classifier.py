from __future__ import annotations
import os
import re
from dataclasses import dataclass
from typing import List, Optional

import yaml

@dataclass
class SchemaTypeRule:
    code: str
    title: str
    description: str = ""
    filename_pattern: Optional[str] = None

_registry: Optional[List[SchemaTypeRule]] = None

def load_registry() -> List[SchemaTypeRule]:
    path = os.getenv("SCHEMA_TYPES_YAML", "config/schema_types.yml")
    rules: List[SchemaTypeRule] = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or []
        for item in data:
            rules.append(SchemaTypeRule(**item))
    except Exception:
        # Фолбэк по умолчанию, если файла нет/битый
        rules = [
            SchemaTypeRule(
                code="design_assignment",
                title="Задание на проектирование",
                description="Схема задания на проектирование (MCS).",
                filename_pattern=r"(?i)DesignAssignment-[0-9]{2}[-_.][0-9]{2}\.xsd",
            ),
            SchemaTypeRule(
                code="explanatory_note",
                title="Пояснительная записка",
                description="Схема пояснительной записки (Раздел 1).",
                filename_pattern=r"(?i)ExplanatoryNote-[0-9]{2}[-_.][0-9]{2}\.xsd",
            ),
            SchemaTypeRule(
                code="expert_conclusion",
                title="Заключение экспертизы",
                description="Схема заключения экспертизы.",
                filename_pattern=r"(?i)(Expert|Examination)Conclusion-[0-9]{2}[-_.][0-9]{2}\.xsd",
            ),
        ]
    return rules

def get_registry() -> List[SchemaTypeRule]:
    global _registry
    if _registry is None:
        _registry = load_registry()
    return _registry

def classify(filename: str, content: bytes) -> Optional[SchemaTypeRule]:
    # Пока используем только имя файла; при необходимости добавим эвристики по содержимому
    for rule in get_registry():
        if rule.filename_pattern and re.search(rule.filename_pattern, filename):
            return rule
    return None
