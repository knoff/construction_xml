# revision identifiers, used by Alembic.
revision = "0007_add_version_flags"
down_revision = "0006_a20_object_name"

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.add_column("document_versions", sa.Column("status", sa.String(length=16), nullable=False, server_default="draft"))
    op.add_column("document_versions", sa.Column("errors", sa.JSON(), nullable=True))
    op.add_column("document_versions", sa.Column("errors_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("document_versions", sa.Column("is_protected", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("document_versions", sa.Column("is_selected", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    # drop server defaults to keep future rows clean
    op.alter_column("document_versions", "status", server_default=None)
    op.alter_column("document_versions", "errors_count", server_default=None)
    op.alter_column("document_versions", "is_protected", server_default=None)
    op.alter_column("document_versions", "is_selected", server_default=None)
    # partial unique index: one selected per document
    op.execute("""
        CREATE UNIQUE INDEX uq_document_versions_selected_once
        ON document_versions (document_id)
        WHERE is_selected = TRUE
    """)

def downgrade():
    op.execute("DROP INDEX IF EXISTS uq_document_versions_selected_once")
    op.drop_column("document_versions", "is_selected")
    op.drop_column("document_versions", "is_protected")
    op.drop_column("document_versions", "errors_count")
    op.drop_column("document_versions", "errors")
    op.drop_column("document_versions", "status")
