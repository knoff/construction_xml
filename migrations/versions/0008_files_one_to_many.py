"""files one-to-many to objects + signatures + attrs

Revision ID: 0008_files_one_to_many
Revises: 0007_add_version_flags
Create Date: 2025-09-05

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0008_files_one_to_many"
down_revision = "0007_add_version_flags"
branch_labels = None
depends_on = None

def upgrade():
    # 1) расширяем files
    with op.batch_alter_table("files") as b:
        # если колонка filename была — переименуем в original_name
        conn = op.get_bind()
        insp = sa.inspect(conn)
        cols = [c["name"] for c in insp.get_columns("files")]
        if "filename" in cols and "original_name" not in cols:
            b.alter_column("filename", new_column_name="original_name", existing_type=sa.String(length=255))
        # новые поля
        b.add_column(sa.Column("object_id", sa.Integer(), nullable=True))
        b.add_column(sa.Column("storage_path", sa.String(length=512), nullable=True))
        b.add_column(sa.Column("crc32", sa.String(length=8), nullable=True))
        b.add_column(sa.Column("title", sa.String(length=512), nullable=True))
        b.add_column(sa.Column("doc_number", sa.String(length=128), nullable=True))
        b.add_column(sa.Column("doc_date", sa.String(length=32), nullable=True))
        b.add_column(sa.Column("author", sa.String(length=255), nullable=True))
        b.add_column(sa.Column("doc_type", sa.String(length=128), nullable=True))
        b.add_column(sa.Column("group", sa.String(length=8), nullable=True))
        b.add_column(sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        # индексы
        b.create_index("ix_files_object_id", ["object_id"], unique=False)
        b.create_index("ix_files_storage_path", ["storage_path"], unique=True)
        b.create_index("ix_files_crc32", ["crc32"], unique=False)
        b.create_index("ix_files_is_deleted", ["is_deleted"], unique=False)
    # FK
    op.create_foreign_key("fk_files_object_id_objects", "files", "objects", ["object_id"], ["id"], ondelete="SET NULL")

    # 2) таблица file_signatures
    op.create_table(
        "file_signatures",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("file_id", sa.Integer(), sa.ForeignKey("files.id"), nullable=False, index=True),
        sa.Column("sig_file_id", sa.Integer(), sa.ForeignKey("files.id"), nullable=False, index=True),
        sa.Column("algo", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

def downgrade():
    op.drop_table("file_signatures")
    op.drop_constraint("fk_files_object_id_objects", "files", type_="foreignkey")
    with op.batch_alter_table("files") as b:
        b.drop_index("ix_files_is_deleted")
        b.drop_index("ix_files_crc32")
        b.drop_index("ix_files_storage_path")
        b.drop_index("ix_files_object_id")
        b.drop_column("is_deleted")
        b.drop_column("group")
        b.drop_column("doc_type")
        b.drop_column("author")
        b.drop_column("doc_date")
        b.drop_column("doc_number")
        b.drop_column("title")
        b.drop_column("crc32")
        b.drop_column("storage_path")
        b.drop_column("object_id")
        # откатывать rename обратно не обязательно
