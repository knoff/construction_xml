"""Add value_links and value_locks tables

Revision ID: 0012_value_links_and_locks
Revises: 0011_schema_ui_overrides
Create Date: 2025-11-13
"""
from alembic import op
import sqlalchemy as sa


revision = "0012_value_links_and_locks"
down_revision = "0011_schema_ui_overrides"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "value_links",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("left_key", sa.String(length=255), nullable=False),
        sa.Column("right_key", sa.String(length=255), nullable=False),
        sa.Column("relation", sa.String(length=16), nullable=False, server_default="eq"),
        sa.Column("weight", sa.Integer(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.UniqueConstraint("left_key", "right_key", "relation", name="uq_value_links_pair"),
    )

    op.create_index("ix_value_links_left", "value_links", ["left_key"], unique=False)
    op.create_index("ix_value_links_right", "value_links", ["right_key"], unique=False)

    op.create_table(
        "value_locks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("locked_key", sa.String(length=255), nullable=False),
        sa.Column("source_key", sa.String(length=255), nullable=False),
        sa.Column("mode", sa.String(length=32), nullable=False, server_default="sync_on_open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.Column("comment", sa.String(), nullable=True),
        sa.UniqueConstraint("locked_key", name="uq_value_locks_locked_key"),
    )

    op.create_index("ix_value_locks_locked_key", "value_locks", ["locked_key"], unique=False)
    op.create_index("ix_value_locks_source", "value_locks", ["source_key"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_value_locks_source", table_name="value_locks")
    op.drop_index("ix_value_locks_locked_key", table_name="value_locks")
    op.drop_table("value_locks")

    op.drop_index("ix_value_links_right", table_name="value_links")
    op.drop_index("ix_value_links_left", table_name="value_links")
    op.drop_table("value_links")
