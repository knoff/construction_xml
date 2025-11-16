# Инструменты и фикстуры

## Общий стек

- **Python**: pytest, pytest-asyncio, pytest-mock, factory_boy.
- **JavaScript/TypeScript**: Vitest/Jest, React Testing Library, MSW, Playwright.
- **Инфраструктура**: Docker Compose для тестовых окружений, GitHub Actions как оркестратор.

## Фикстуры и тестовые данные

- Backend:
  - `tests/backend/fixtures/` — json/yaml с примерными данными.
  - Фабрики (factory_boy) для генерации сущностей.
  - SQL-скрипты для подготовки состояния (располагаются в `tests/backend/sql`).
- Frontend:
  - `frontend/src/test-utils` — провайдеры (store, router), хелперы рендера.
  - MSW handlers (`frontend/src/test-utils/msw-handlers.ts`).
- E2E:
  - `tests/e2e/fixtures` — учётные записи, схемы, токены.
  - Скрипты подготовки окружения (CLI или makefile).

## Конфигурация

- `pytest.ini` — общие настройки: маркеры (`unit`, `integration`, `e2e`), пути.
- `pyproject.toml` — конфиги black, isort, mypy.
- `frontend/vitest.config.ts` или `jest.config.js` — алиасы модулей, трансформации.
- `tests/e2e/playwright.config.ts` — базовый URL, timeout, retries.

## Моки и стабы

- Backend: `unittest.mock`, `pytest-mock`, локальные заглушки для MinIO/S3.
- Frontend: MSW для HTTP, Sinon/Fake timers при необходимости.
- E2E: заглушки внешних API через проксирование или `msw` в node-режиме.

## Запуск тестов

- Backend: `pytest` (по маркерам `-m unit`, `-m integration`).
- Frontend: `npm run test` или `pnpm test` (уточнить). Для компонентных тестов — `npm run test:component`.
- E2E: `npx playwright test`.
- Сборка покрытия: `pytest --cov`, `npm run test -- --coverage`.

## Локальные окружения

- Используем `docker-compose.test.yml` для поднятия PostgreSQL и MinIO.
- В README и документации описываем команды подготовки.

## Актуальность

- При добавлении новых инструментов или фиксирования багов обновляем раздел.
- Документ связан с инструкциями в `docs/testing/backend.md`, `frontend.md`, `ci.md`.
