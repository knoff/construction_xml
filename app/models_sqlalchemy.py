from __future__ import annotations
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, JSON, DateTime, ForeignKey, UniqueConstraint, cast, Boolean, Index
from sqlalchemy.sql import func

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign

from app.db import Base
from zlib import crc32  # для подсказки в util-слое (не в модели)



class SchemaType(Base):
    __tablename__ = "schema_types"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    filename_pattern: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("code", name="uq_schema_types_code"),
    )

class DocumentRow(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doc_uid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    cdm: Mapped[dict] = mapped_column(JSON)
    schema_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    schema_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # A2-0 additions (нужны для CRUD и связки):
    object_id: Mapped[Optional[int]] = mapped_column(ForeignKey("objects.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")

    # ORM-отношения (оба view-only, чтобы не менять существующие FK/типы):
    # 1) к ObjectRow — обычная FK-связь по object_id
    object_rel = relationship("ObjectRow", lazy="joined", foreign_keys=[object_id], viewonly=True)
    # 2) к Schema — schema_id хранится как String, а schemas.id — Integer,
    #    поэтому кастуем id схемы к String на лету. Никаких строковых выражений,
    #    только реальный Python-экспрешн в lambda (отложенная инициализация).
    schema_rel = relationship(
        "Schema",
        # our side (documents.schema_id) is the FK-like column (stored as String),
        # so we mark it explicitly with foreign(), and cast Schema.id -> String
        primaryjoin=lambda: foreign(DocumentRow.schema_id) == cast(Schema.id, String),
        viewonly=True,
        lazy="joined",
        uselist=False,   # many-to-one
    )

class ObjectRow(Base):
    __tablename__ = "objects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    obj_uid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String)  # user-facing name
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # «один объект → много файлов»
    files: Mapped[list["FileRow"]] = relationship("FileRow", lazy="selectin", primaryjoin="FileRow.object_id==ObjectRow.id")


class DocumentVersionRow(Base):
    __tablename__ = "document_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB)  # JSONB for GIN/jsonb_path_ops
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # new:
    status: Mapped[str] = mapped_column(String(16), default="draft")  # 'draft' | 'clean' | 'final'
    errors: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {items:[...]} or None
    errors_count: Mapped[int] = mapped_column(Integer, default=0)
    is_protected: Mapped[bool] = mapped_column(Boolean, default=False)  # manual “freeze”; final is implicitly protected
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)  # chosen for editing/view

# one selected version per document (partial unique index)
Index(
    "uq_document_versions_selected_once",
    DocumentVersionRow.document_id,
    unique=True,
    postgresql_where=(DocumentVersionRow.is_selected == True),
)

# --- Files domain ---

class FileRow(Base):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # общие метаданные (добавлены 0008, остаются в files)
    object_id: Mapped[Optional[int]] = mapped_column(ForeignKey("objects.id"), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    doc_number: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    doc_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    author: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    doc_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    group: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # связь с версиями (file_versions)
    versions: Mapped[list["FileVersionRow"]] = relationship(
        "FileVersionRow", back_populates="file", lazy="selectin"
    )

    # --- совместимость со старым кодом: проксируем к последней версии (read-only) ---
    @property
    def _latest_version(self) -> Optional["FileVersionRow"]:
        if not self.versions:
            return None
        # сначала ищем среди неудалённых
        alive = [v for v in self.versions if not getattr(v, "is_deleted", False)]
        pool = alive if alive else list(self.versions)
        return max(pool, key=lambda v: (v.created_at or datetime.min))

    @property
    def filename(self) -> Optional[str]:
        v = self._latest_version
        return v.original_name if v else None

    @property
    def sha256(self) -> Optional[str]:
        v = self._latest_version
        return v.sha256 if v else None

    @property
    def size(self) -> Optional[int]:
        v = self._latest_version
        return v.size if v else None

    @property
    def mime(self) -> Optional[str]:
        v = self._latest_version
        return v.mime if v else None

    @property
    def storage_path(self) -> Optional[str]:
        v = self._latest_version
        return v.storage_path if v else None

    @property
    def crc32(self) -> Optional[str]:
        v = self._latest_version
        return v.crc32 if v else None


class FileVersionRow(Base):
    __tablename__ = "file_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_id: Mapped[int] = mapped_column(ForeignKey("files.id"), nullable=False)
    storage_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    original_name: Mapped[str] = mapped_column(String(255))
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    crc32: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    size: Mapped[int] = mapped_column(Integer)
    mime: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    file: Mapped["FileRow"] = relationship("FileRow", back_populates="versions")

class FileSignatureRow(Base):
    __tablename__ = "file_signatures"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_version_id: Mapped[int] = mapped_column(ForeignKey("file_versions.id"), index=True)
    sig_file_id: Mapped[int] = mapped_column(ForeignKey("files.id"), index=True)
    algo: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)        # GOST/PKCS7/…
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

class ValueLinkRow(Base):
    """Базовая связь между двумя путями значений (документ ↔ документ / документ ↔ сущность)."""

    __tablename__ = "value_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    left_key: Mapped[str] = mapped_column(String(255), nullable=False)
    right_key: Mapped[str] = mapped_column(String(255), nullable=False)
    relation: Mapped[str] = mapped_column(String(16), default="eq")
    weight: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("left_key", "right_key", "relation", name="uq_value_links_pair"),
        Index("ix_value_links_left", "left_key"),
        Index("ix_value_links_right", "right_key"),
    )


class ValueLockRow(Base):
    """Замок значения: поле подписывается на источник и синхронизируется по выбранному режиму."""

    __tablename__ = "value_locks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    locked_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    source_key: Mapped[str] = mapped_column(String(255), nullable=False)
    mode: Mapped[str] = mapped_column(String(32), default="sync_on_open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    comment: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("locked_key", name="uq_value_locks_locked_key"),
        Index("ix_value_locks_source", "source_key"),
    )

class RuleRow(Base):
    __tablename__ = "rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rule_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    content: Mapped[dict] = mapped_column(JSON)
    version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class Schema(Base):
    __tablename__ = "schemas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    version: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    namespace: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    # Новое: JSONB поле для переопределений UI (label-ы, подсказки, замены компонентов и т.д.)
    ui_overrides: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Новое: связь с типом схемы
    type_id: Mapped[Optional[int]] = mapped_column(ForeignKey("schema_types.id"), nullable=True)
    type: Mapped[Optional[SchemaType]] = relationship("SchemaType", lazy="joined")