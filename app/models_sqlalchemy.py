from sqlalchemy import Column, String, Integer, JSON, LargeBinary, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

class DocumentRow(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doc_uid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    cdm: Mapped[dict] = mapped_column(JSON)
    schema_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    schema_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class FileRow(Base):
    __tablename__ = "files"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255))
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    size: Mapped[int] = mapped_column(Integer)
    mime: Mapped[str | None] = mapped_column(String(128), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped = mapped_column(DateTime(timezone=True), server_default=func.now())

class RuleRow(Base):
    __tablename__ = "rules"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rule_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    content: Mapped[dict] = mapped_column(JSON)
    version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped = mapped_column(DateTime(timezone=True), server_default=func.now())

class Schema(Base):
    __tablename__ = "schemas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    version = Column(String, nullable=True)
    namespace = Column(String, nullable=True)
    description = Column(String, nullable=True)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)