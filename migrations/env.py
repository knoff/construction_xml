from __future__ import annotations
import os, sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Ensure project root is on sys.path
here = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(here, os.pardir))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# this is the Alembic Config object
config = context.config

# Override url from env var if present
db_url = os.getenv("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

# Logging
if config.config_file_name is not None:
    try:
        fileConfig(config.config_file_name, disable_existing_loggers=False)
    except Exception as e:
        # не валим миграции из-за логирования
        pass

# Import metadata
try:
    from app.db import Base  # type: ignore
except ModuleNotFoundError as e:
    # Try fallback: if your package is named differently, allow ENV APP_PACKAGE
    pkg = os.getenv("APP_PACKAGE", "app")
    mod = __import__(f"{pkg}.db", fromlist=["Base"])
    Base = getattr(mod, "Base")

target_metadata = Base.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
