"""0010_relax_files_original_name: drop NOT NULL on files.original_name (moved to file_versions)

Revision ID: 0010_relax_files_original_name
Revises: 0009_file_versions
Create Date: 2025-09-06
"""
from alembic import op

# ревизии
revision = "0010_relax_files_original_name"
down_revision = "0009_file_versions"
branch_labels = None
depends_on = None


def upgrade():
    # Снимаем NOT NULL только если он установлен
    op.execute("""
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='files' AND column_name='original_name' AND is_nullable='NO'
      ) THEN
        ALTER TABLE files ALTER COLUMN original_name DROP NOT NULL;
      END IF;
    END$$;
    """)

    # (опционально) если вдруг в отдельных инсталляциях стояли NOT NULL на других «бинарных» полях,
    # снимем и с них — сейчас эти поля живут в file_versions:
    for col in ("sha256", "size", "mime", "storage_path", "crc32"):
        op.execute(f"""
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name='files' AND column_name='{col}' AND is_nullable='NO'
          ) THEN
            ALTER TABLE files ALTER COLUMN "{col}" DROP NOT NULL;
          END IF;
        END$$;
        """)


def downgrade():
    # Обратный ход: возвращать NOT NULL не будем — данные уже переехали в file_versions.
    pass
