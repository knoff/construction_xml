from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models_sqlalchemy import SchemaType


@dataclass
class SchemaTypeRule:
    code: str
    title: str
    description: str = ""
    filename_pattern: Optional[str] = None


def db_registry(db: Session) -> List[SchemaTypeRule]:
    rows = db.query(SchemaType).order_by(SchemaType.id.asc()).all()
    return [
        SchemaTypeRule(
            code=row.code,
            title=row.title,
            description=(row.description or ""),
            filename_pattern=(row.filename_pattern or None),
        )
        for row in rows
    ]


def classify(filename: str, content: bytes, db: Session) -> Optional[SchemaTypeRule]:
    """Определить тип схемы по имени файла и правилам из БД."""

    fname = os.path.basename(filename or "")

    for rule in db_registry(db):
        pattern = (rule.filename_pattern or "").strip()
        if not pattern:
            continue
        try:
            regex = re.compile(pattern, flags=re.IGNORECASE | re.UNICODE)
        except re.error:
            continue
        if regex.search(fname):
            return rule

    low = fname.lower()
    prefix_map = {
        "designassignment": "design_assignment",
        "explanatorynote": "explanatory_note",
        "expertconclusion": "expert_conclusion",
        "examinationconclusion": "expert_conclusion",
    }
    for prefix, code in prefix_map.items():
        if low.startswith(prefix):
            row = db.query(SchemaType).filter(SchemaType.code == code).first()
            if row:
                return SchemaTypeRule(
                    code=row.code,
                    title=row.title,
                    description=row.description or "",
                    filename_pattern=row.filename_pattern or None,
                )
    return None
