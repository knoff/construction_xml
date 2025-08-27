"""add schema_types table and fk from schemas"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# ИД предыдущей миграции адаптируй под свой 0002
revision = "0003_schema_types"
down_revision = "0002_schemas"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "schema_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(length=64), nullable=False, unique=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("filename_pattern", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column("updated_at", sa.DateTime(), nullable=False, default=datetime.utcnow),
    )
    op.create_index("ix_schema_types_code", "schema_types", ["code"], unique=True)

    op.add_column("schemas", sa.Column("type_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_schemas_type",
        "schemas",
        "schema_types",
        ["type_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("fk_schemas_type", "schemas", type_="foreignkey")
    op.drop_column("schemas", "type_id")
    op.drop_index("ix_schema_types_code", table_name="schema_types")
    op.drop_table("schema_types")
