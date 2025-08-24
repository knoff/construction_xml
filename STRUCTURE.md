# STRUCTURE.md — слепок структуры репозитория (PR #1 `feature/xsd-registry-form`)

Этот файл — «точка входа»: содержит дерево каталогов и назначение каждого файла. Поддерживаем его в актуальном состоянии при любом изменении структуры.

> Базовая идея сервиса: FastAPI-приложение, хранение метаданных в PostgreSQL (SQLAlchemy/Alembic), файлов — в MinIO (S3), интерфейсы для загрузки/просмотра XSD и справочника типов схем.

---

## Корень репозитория

- `/README.md` — обзор проекта, цели и майлстоуны A1–A4/B1–B5 (основано на содержимом файла).
- `/LICENSE` — лицензия CC-BY-NC 4.0 (основано на содержимом файла).
- `/requirements.txt` — зависимости Python (FastAPI, SQLAlchemy, Alembic, lxml, Jinja2 и др.) (основано на содержимом файла).
- `/.env.example` — пример переменных окружения (порты, параметры Postgres/MinIO, S3_BUCKET и т. д.) (основано на содержимом файла).
- `/docker-compose.yml` — локальная инфраструктура: сервисы `app`, `postgres`, `minio`; проброс портов; переменные окружения для S3 (основано на содержимом файла).
- `/alembic.ini` → **в PR меняется** на `script_location = migrations` (т. е. каталог миграций переезжает в `migrations/`) (основано на диффе PR).
- `/init-minio.ps1` — утилита для инициализации MinIO и создания бакета из Windows/PowerShell (основано на содержимом файла).
- `/.github/workflows/ci.yml` — **новый в PR** CI: поднимает Postgres и MinIO, выполняет Alembic upgrade, запускает pytest (основано на диффе PR).
- `/.vscode/tasks.json` — задачи для `docker compose`, Alembic upgrade/downgrade, pytest (основано на содержимом файла).
- `/.vscode/settings.json` — **новый/обновлённый в PR** настройки Python для рабочей папки (основано на диффе PR).

---

## Приложение (`/app`)

- `/app/main.py` — создание FastAPI-приложения и регистрация роутеров: `health`, `schemas`, `schema-types` (новый в PR), `documents`, `files`, `rules`, `sign` (основано на импортах и диффе PR).
- `/app/db.py` — инициализация SQLAlchemy (`engine`, `SessionLocal`, `Base`) + **в PR добавляется** `get_db()` (зависимость FastAPI для сессии БД) (основано на диффе PR).

### Конфигурация и модели

- `/app/core/config.py` — pydantic-настройки приложения: лимиты загрузки, каталоги хранения и пр. (основано на содержимом файла).
- `/app/models/cdm.py` — pydantic-модели CDM (Project/Document/…); используются API `/documents` для MVP (основано на содержимом файла и импортах `app/api/routes/documents.py`).
- `/app/models_sqlalchemy.py` — ORM-модели:
  - **в PR добавлено**: `SchemaType` (справочник типов схем) и `Schema` (метаданные XSD, путь к файлу в S3/MinIO, связь с `SchemaType`);
  - уже были: `DocumentRow`, `FileRow`, `RuleRow` (основано на диффе PR).

### Роуты API (`/app/api/routes`)

- `/app/api/routes/health.py` — `GET /health` (простой статус) (основано на содержимом файла).
- `/app/api/routes/schemas.py` — **переписан в PR**: теперь префикс `"/schemas"` и HTML-интерфейс (Jinja2), загрузка `.xsd` с проверкой размера, сохранение файла в MinIO (`save_file_minio`), парсинг метаданных (`schema_parser`), классификация (`schema_classifier`), запись в БД (`Schema`), просмотр карточки, удаление с очисткой файла в MinIO (основано на диффе PR).
- `/app/api/routes/schema_types.py` — **новый в PR**: CRUD HTML-форм для справочника типов схем (листинг, создание/редактирование/удаление) (основано на диффе PR).
- `/app/api/routes/documents.py` — MVP-эндпоинты `/documents` с in-memory хранилищем CDM-документов (основано на содержимом файла).
- `/app/api/routes/files.py` — загрузка произвольных файлов, проверка размера против `MAX_UPLOAD_MB`, сохранение (локальный стор) (основано на содержимом файла).
- `/app/api/routes/rules.py` — загрузка YAML-правил, в PR меняется поле модели с `validate` на `condition` (основано на диффе PR).
- `/app/api/routes/sign.py` — проверка detached-подписи (пока заглушка через `app.services.signatures`) (основано на содержимом файла).

### Сервисы (`/app/services`)

- `/app/services/schema_parser.py` — **новый в PR**: извлечение `name/version/namespace/description` из XSD; терпимый парсер (`lxml`) и эвристика извлечения версии из имени файла (основано на диффе PR).
- `/app/services/schema_classifier.py` — **новый в PR**: классификация загруженной схемы: сначала regex-паттерны из БД `SchemaType.filename_pattern`, затем устойчивые эвристики по префиксу имени (основано на диффе PR).
- `/app/services/files.py` — операции сохранения загружаемых файлов в локальное хранилище (используется `/files/upload`) (основано на содержимом файла).
- `/app/services/rules.py` — валидация и сохранение YAML-правил в `app/rules/*.yaml`; модель `Rule` (в PR поле `condition`) (основано на содержимом файла и диффе PR).
- `/app/services/signatures.py` — заглушка для проверки ЭП (структура ответа, пометки «не реализовано в MVP») (основано на содержимом файла).
- `/app/services/xsd_registry.py` — **legacy**: файловый «реестр» `data/schemas` (не используется после PR, к удалению после миграции) (основано на содержимом файла и замене импорта в PR).

### Хранилище и шаблоны

- `/app/storage/__init__.py` (или `/app/storage.py`) — **новый в PR**: адаптер MinIO с функциями `save_file_minio` / `delete_file_minio`, используется роутером `schemas` при загрузке/удалении XSD (основано на импорте в диффе PR).
- `/app/web/templates/__init__.py` — **новый в PR**: инициализация Jinja2 (`templates`), используется в `schemas.py` и `schema_types.py` (основано на импортах в диффе PR).
- `/app/web/templates/schemas/list.html` — **новый в PR**: HTML-список загруженных схем (основано на использовании в диффе PR).
- `/app/web/templates/schemas/upload.html` — **новый в PR**: HTML-форма загрузки XSD (основано на использовании в диффе PR).
- `/app/web/templates/schemas/view.html` — **новый в PR**: HTML-карточка схемы (основано на использовании в диффе PR).
- `/app/web/templates/schema_types/list.html` — **новый в PR**: HTML-список типов (основано на использовании в диффе PR).
- `/app/web/templates/schema_types/form.html` — **новый в PR**: HTML-форма создания/редактирования типа (основано на использовании в диффе PR).

---

## Миграции БД

- **До PR**: каталог `/alembic/` (в т. ч. `/alembic/env.py`, `/alembic/versions/0001_init.py`) — начальные таблицы `documents`, `files`, `rules` (основано на содержимом файлов).
- **В PR**: `alembic.ini` указывает `script_location = migrations` — планируется перенос миграций в `/migrations/` (после мержа привести структуру в соответствие и перенести версии).

---

## Прочее

- `/app/rules/example_rules.yaml` — пример файла правил для разработки/тестов (основано на содержимом файла).
