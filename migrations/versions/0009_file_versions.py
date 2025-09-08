"""0009_file_versions: introduce file_versions and common file metadata; move binary attrs to versions

Revision ID: 0009_file_versions
Revises: 0008_files_one_to_many
Create Date: 2025-09-06
"""
from alembic import op
import sqlalchemy as sa

# ревизии
revision = "0009_file_versions"
down_revision = "0008_files_one_to_many"
branch_labels = None
depends_on = None


def upgrade():
    # === 1) files: добавить (если нет) общие поля/индексы/FK — НИЧЕГО не должно падать ===
    op.execute('ALTER TABLE files ADD COLUMN IF NOT EXISTS object_id INTEGER')
    op.execute('CREATE INDEX IF NOT EXISTS ix_files_object_id ON files (object_id)')

    # FK на objects — добавляем только если констрейнта ещё нет
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_files_object_id_objects'
      ) THEN
        ALTER TABLE files
          ADD CONSTRAINT fk_files_object_id_objects
          FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE SET NULL;
      END IF;
    END$$;
    """)

    # общие метаданные и служебные поля
    op.execute('ALTER TABLE files ADD COLUMN IF NOT EXISTS title      VARCHAR(512)')
    op.execute('ALTER TABLE files ADD COLUMN IF NOT EXISTS doc_number VARCHAR(128)')
    op.execute('ALTER TABLE files ADD COLUMN IF NOT EXISTS doc_date   VARCHAR(32)')
    op.execute('ALTER TABLE files ADD COLUMN IF NOT EXISTS author     VARCHAR(255)')
    op.execute('ALTER TABLE files ADD COLUMN IF NOT EXISTS doc_type   VARCHAR(128)')
    op.execute('ALTER TABLE files ADD COLUMN IF NOT EXISTS "group"    VARCHAR(8)')
    op.execute('ALTER TABLE files ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE')
    op.execute('ALTER TABLE files ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()')

    # === 2) file_versions: создать таблицу и индексы, если их ещё нет ===
    op.execute("""
    CREATE TABLE IF NOT EXISTS file_versions (
        id            SERIAL PRIMARY KEY,
        file_id       INTEGER NOT NULL REFERENCES files(id),
        storage_path  VARCHAR(512),
        original_name VARCHAR(255) NOT NULL,
        sha256        VARCHAR(64)  NOT NULL,
        crc32         VARCHAR(8),
        size          INTEGER      NOT NULL,
        mime          VARCHAR(128),
        is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    """)
    op.execute('CREATE INDEX IF NOT EXISTS ix_file_versions_file_id ON file_versions(file_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_file_versions_sha256  ON file_versions(sha256)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_file_versions_crc32   ON file_versions(crc32)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_file_versions_storage ON file_versions(storage_path)')

    # === 3) Перенести исходные бинарные атрибуты из files в начальные версии (только там, где версий ещё нет) ===
    # ВАЖНО: используем original_name / storage_path / crc32, добавленные в 0008.
    op.execute("""
    INSERT INTO file_versions
        (file_id, storage_path, original_name, sha256, crc32, size, mime, is_deleted, created_at)
    SELECT
        f.id,
        f.storage_path,                                    -- уже есть после 0008
        COALESCE(f.original_name, 'unknown.bin'),
        COALESCE(f.sha256, ''),                            -- sha256 тоже уже был в files
        f.crc32,
        COALESCE(f.size, 0),
        f.mime,
        COALESCE(f.is_deleted, FALSE),
        COALESCE(f.created_at, NOW())
    FROM files f
    WHERE NOT EXISTS (
        SELECT 1 FROM file_versions fv WHERE fv.file_id = f.id
    );
    """)

    # === 4) file_signatures → привязать к ВЕРСИИ ===
    # Делаем всё только если таблица file_signatures существует
    op.execute("""
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name='file_signatures' AND table_schema=current_schema()) THEN

        -- добавить столбец для ссылки на версию
        EXECUTE 'ALTER TABLE file_signatures ADD COLUMN IF NOT EXISTS file_version_id INTEGER';

        -- проставить ссылку по существующим данным (если раньше был file_id)
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='file_signatures' AND column_name='file_id') THEN
          UPDATE file_signatures s
          SET file_version_id = fv.id
          FROM file_versions fv
          WHERE s.file_version_id IS NULL
            AND s.file_id = fv.file_id;
        END IF;

        -- FK на версию (если ещё нет)
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_file_signatures_version'
        ) THEN
          ALTER TABLE file_signatures
            ADD CONSTRAINT fk_file_signatures_version
            FOREIGN KEY (file_version_id) REFERENCES file_versions(id);
        END IF;

        -- попытаться сделать NOT NULL (если все строки заполнены)
        BEGIN
          ALTER TABLE file_signatures ALTER COLUMN file_version_id SET NOT NULL;
        EXCEPTION WHEN others THEN
          -- оставим NULL, если есть «висящие» строки; админ поправит руками при необходимости
        END;

        -- снести старое поле/констрейнт, если они ещё существуют
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='file_signatures' AND column_name='file_id') THEN
          BEGIN
            ALTER TABLE file_signatures DROP CONSTRAINT IF EXISTS fk_file_signatures_file_id_files;
          EXCEPTION WHEN others THEN
          END;
          ALTER TABLE file_signatures DROP COLUMN IF EXISTS file_id;
        END IF;

      END IF;
    END$$;
    """)


def downgrade():
    # Обратный ход делаем максимально мягко.
    op.execute("""
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name='file_signatures' AND table_schema=current_schema()) THEN
        -- вернуть file_id (best-effort)
        EXECUTE 'ALTER TABLE file_signatures ADD COLUMN IF NOT EXISTS file_id INTEGER';
        UPDATE file_signatures s
        SET file_id = fv.file_id
        FROM file_versions fv
        WHERE s.file_version_id = fv.id;

        -- FK на files
        BEGIN
          ALTER TABLE file_signatures
            ADD CONSTRAINT fk_file_signatures_file_id_files
            FOREIGN KEY (file_id) REFERENCES files(id);
        EXCEPTION WHEN others THEN
        END;

        -- убрать FK/колонку на версии
        BEGIN
          ALTER TABLE file_signatures DROP CONSTRAINT IF EXISTS fk_file_signatures_version;
        EXCEPTION WHEN others THEN
        END;
        ALTER TABLE file_signatures DROP COLUMN IF EXISTS file_version_id;
      END IF;
    END$$;
    """)

    # Таблицу версий можно снести, если это допустимо
    op.execute("DROP TABLE IF EXISTS file_versions")

    # Удаление полей из files (опционально)
    for col in ("object_id","title","doc_number","doc_date","author","doc_type","group","is_deleted"):
        op.execute(f'ALTER TABLE files DROP COLUMN IF EXISTS "{col}"')
    op.execute('ALTER TABLE files DROP CONSTRAINT IF EXISTS fk_files_object_id_objects')
    op.execute('DROP INDEX IF EXISTS ix_files_object_id')
