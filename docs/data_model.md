# Draft: Data Model and Document Handling Logic

## 1. Реестр схем (A1)
- **Сущность:** `schemas`
- Поля: `id`, `name`, `version` (из XSD, `SchemaVersion`), `namespace`, `description`, `file_path`, `created_at`.
- Использование: загрузка XSD, хранение в MinIO, извлечение метаданных.

## 2. Реестр объектов (A2-6)
- **Сущность:** `objects`
- Поля: `id`, `created_at`.
- Каждому объекту соответствуют документы разных типов (задание, ПЗ, заключение).

## 3. Документы и их слепки
- **Сущности:**
  - `documents`: `id`, `object_id`, `schema_id`, `schema_version`, `status` (draft/final).
  - `document_versions`: `id`, `document_id`, `payload jsonb`, `created_at`.
- **Назначение:** хранение всех редакций заполнений документа (черновики и финальные версии).
- **Payload:** XML→JSON (один-в-один по XSD, включая массивы и атрибуты).

## 4. Генерация форм (A2)
- На основе `schemas` и разбора XSD (internal model).
- Поля: тип, min/maxOccurs, enum, подсказки (`xs:documentation`).
- Интерфейс: **React** (раньше был Jinja/HTMX → заменили).
- Требования:
  - рендер повторяемых узлов (arrays);
  - поддержка вложенных структур;
  - базовая валидация (required, типы, min/maxOccurs) на фронте и бэке.

## 5. Экспорт (A2-4)
- Из `document_versions.payload` генерируем XML, валидный по XSD.
- Проверки: типы, структура, min/maxOccurs.

## 6. Маппинг полей между схемами (A3-5)
- **Сущности:**
  - `schema_fields`: `id`, `schema_id`, `xsd_path`, `dtype`, `min/maxOccurs`.
  - `field_links`: `from_schema_field_id`, `to_schema_field_id`, `direction (push|pull|sync)`, `priority`, `transform`.
- **Назначение:** описывает связи между полями разных схем (напр. «наименование объекта»).
- **Автоматика:** первичный bootstrap маппинга по совпадению имён и документации; корректировка руками.

## 7. Авточерновики (A2-7)
- При создании нового документа подтягиваем значения из финальных версий других документов объекта.
- Используем `field_links(direction in (push,sync))`.
- Конфликты решаются по `priority`.

## 8. Двусторонняя синхронизация (A3-6)
- При финализации документа значения распространяются в черновики других документов по `sync`-связям.
- Барьер от циклов: «provenance» метки.

## 9. Кросс-проверки (A3-7)
- Перед экспортом документа сверяем значения связанных полей с финальными версиями других документов.
- Несоответствия пишутся в `cross_checks (object_id, details jsonb)` и показываются пользователю.

## 10. Файлы и их привязки (B1-2)
- **Сущности:**
  - `files`: `id`, `object_id`, `storage_url`, `filename`, `size`, `mime`, `checksum (sha256)`.
  - `file_bindings`: `document_version_id`, `xsd_path`, `file_id`.
- **Назначение:** хранение загруженных файлов, использование их атрибутов (имя, размер, checksum) для автозаполнения полей документов.

## 11. Конвертация между версиями схем (A3-8)
- Правила: `from_version → to_version`.
- Использование: миграция слепков при переходе на новую редакцию XSD.
- Реализация: набор `transform` правил; UI для предпросмотра диффа.

---

## Поток данных
1. Загружаем XSD → `schemas`.
2. Парсим XSD → `schema_fields`.
3. Создаём объект (`objects`).
4. Создаём документ по объекту (`documents`) и черновик (`document_versions`).
5. При создании черновика подтягиваем значения из других финальных документов (A2-7).
6. Пользователь редактирует через React-формы.
7. Сохраняем → валидация по схеме.
8. Финализируем → двусторонняя синхронизация (A3-6).
9. Экспортируем XML → кросс-проверка с другими документами (A3-7).

---

## Минимальные DDL (выжимка)
```sql
CREATE TABLE objects (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  object_id UUID NOT NULL REFERENCES objects(id),
  schema_id BIGINT NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE document_versions (
  id BIGSERIAL PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_doc_payload_gin ON document_versions USING gin (payload jsonb_path_ops);

CREATE TABLE schema_fields (
  id BIGSERIAL PRIMARY KEY,
  schema_id BIGINT NOT NULL,
  xsd_path TEXT NOT NULL,
  dtype TEXT NOT NULL,
  min_occurs INT,
  max_occurs INT
);

CREATE TABLE field_links (
  id BIGSERIAL PRIMARY KEY,
  from_schema_field_id BIGINT NOT NULL REFERENCES schema_fields(id),
  to_schema_field_id BIGINT NOT NULL REFERENCES schema_fields(id),
  direction TEXT NOT NULL CHECK (direction IN ('push','pull','sync')),
  priority INT NOT NULL DEFAULT 100,
  transform TEXT
);

CREATE TABLE cross_checks (
  id BIGSERIAL PRIMARY KEY,
  object_id UUID NOT NULL REFERENCES objects(id),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok BOOLEAN NOT NULL,
  details JSONB
);

CREATE TABLE files (
  id UUID PRIMARY KEY,
  object_id UUID NOT NULL REFERENCES objects(id),
  storage_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime TEXT,
  checksum TEXT NOT NULL,
  checksum_algo TEXT NOT NULL DEFAULT 'sha256'
);

CREATE TABLE file_bindings (
  document_version_id BIGINT NOT NULL REFERENCES document_versions(id),
  xsd_path TEXT NOT NULL,
  file_id UUID NOT NULL REFERENCES files(id),
  PRIMARY KEY (document_version_id, xsd_path, file_id)
);
```

