"""Seed base schema types (design_assignment, explanatory_note, expert_conclusion)

Revision ID: 0004_seed_schema_types
Revises: 0003_schema_types
Create Date: 2025-08-23
"""
from alembic import op
import sqlalchemy as sa

# --- Alembic identifiers ---
revision = "0004_seed_schema_types"
down_revision = "0003_schema_types"
branch_labels = None
depends_on = None

BASE_TYPES = [
    # code,               name,                         filename_pattern (regex, optional)
    ("design_assignment", "Задание на проектирование",  r"(?i)DesignAssignment-[0-9]{2}[-_.][0-9]{2}\\.xsd"),
    ("explanatory_note",  "Пояснительная записка",     r"(?i)ExplanatoryNote-[0-9]{2}[-_.][0-9]{2}\\.xsd"),
    ("expert_conclusion", "Заключение экспертизы",     r"(?i)(Expert|Examination)Conclusion-[0-9]{2}[-_.][0-9]{2}\\.xsd"),
]


def upgrade() -> None:
    conn = op.get_bind()
    meta = sa.MetaData()
    meta.reflect(bind=conn)

    schema_types = sa.Table("schema_types", meta,
        autoload_with=conn
    )

    # читаем уже существующие коды, чтобы сид был идемпотентным
    existing = {
        row[0] for row in conn.execute(sa.select(schema_types.c.code))
    }

    to_insert = [
        dict(code=code, name=name, filename_pattern=pattern)
        for code, name, pattern in BASE_TYPES
        if code not in existing
    ]

    if to_insert:
        conn.execute(sa.insert(schema_types), to_insert)


def downgrade() -> None:
    conn = op.get_bind()
    meta = sa.MetaData()
    meta.reflect(bind=conn)
    schema_types = sa.Table("schema_types", meta, autoload_with=conn)

    conn.execute(
       sa.delete(schema_types).where(
            schema_types.c.code.in_([code for code, *_ in BASE_TYPES])
        )
    )
