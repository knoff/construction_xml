"""Add ui_overrides to schemas

Revision ID: 0011_schema_ui_overrides
Revises: 0010_relax_files_original_name
Create Date: 2025-09-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0011_schema_ui_overrides"
down_revision = "0010_relax_files_original_name"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column(
        "schemas",
        sa.Column("ui_overrides", postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )

def downgrade() -> None:
    op.drop_column("schemas", "ui_overrides")
