from __future__ import annotations
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, JSON, DateTime, ForeignKey, UniqueConstraint, cast, Boolean, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign

from app.db import Base

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

class FileRow(Base):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255))
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    size: Mapped[int] = mapped_column(Integer)
    mime: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

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

    # Новое: связь с типом схемы
    type_id: Mapped[Optional[int]] = mapped_column(ForeignKey("schema_types.id"), nullable=True)
    type: Mapped[Optional[SchemaType]] = relationship("SchemaType", lazy="joined")