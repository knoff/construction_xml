"""A2-0: objects, document_versions, status/object_id for documents

Revision ID: 0005_a20_objects_and_versions
Revises: 0004_seed_schema_types
Create Date: 2025-08-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005_a20_objects_and_versions"
down_revision = "0004_seed_schema_types"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1) objects (int PK + uid + created_at)
    op.create_table(
        "objects",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("obj_uid", sa.String(length=64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_objects_uid", "objects", ["obj_uid"], unique=True)

    # 2) documents: add object_id + status
    op.add_column("documents", sa.Column("object_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_documents_object",
        "documents", "objects",
        ["object_id"], ["id"],
        ondelete="SET NULL",
    )
    op.add_column("documents", sa.Column("status", sa.String(length=16), server_default=sa.text("'draft'"), nullable=False))
    # необязательная CHECK-констрейнт на уровне СУБД
    op.create_check_constraint("ck_documents_status", "documents", "status in ('draft','final')")

    # 3) document_versions
    op.create_table(
        "document_versions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_doc_versions_document", "document_versions", ["document_id"], unique=False)
    op.create_index(
        "ix_doc_versions_payload_gin",
        "document_versions",
        ["payload"],
        unique=False,
        postgresql_using="gin",
        postgresql_ops={"payload": "jsonb_path_ops"},
    )

def downgrade() -> None:
    op.drop_index("ix_doc_versions_payload_gin", table_name="document_versions")
    op.drop_index("ix_doc_versions_document", table_name="document_versions")
    op.drop_table("document_versions")
    op.drop_constraint("ck_documents_status", "documents", type_="check")
    op.drop_constraint("fk_documents_object", "documents", type_="foreignkey")
    op.drop_column("documents", "status")
    op.drop_column("documents", "object_id")
    op.drop_index("ix_objects_uid", table_name="objects")
    op.drop_table("objects")
