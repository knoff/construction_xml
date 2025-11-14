# Value Links & Locks API

Документ фиксирует контракт REST API для механизма мэппинга значений между документами/сущностями и его «замков».

## Базовые сущности

- **ValueLink** — связь между двумя путями значений.
  - `left_key`, `right_key`: строки формата `<schemaCode>#<version>.<xpath>` или `<entityName>.<path>`.
  - `relation`: пока поддерживаем только "eq" (значения должны совпадать).
  - `weight`: необязательный вес связи (используется в алгоритмах сопоставления массивов).
  - `meta`: произвольные дополнительные данные (JSON).

- **ValueLock** — замыкает поле на источник, чтобы подтягивать данные автоматически.
  - `locked_key`: путь значения, которое блокируем.
  - `source_key`: путь, откуда брать значения.
  - `mode`: `"sync_on_open"` | `"sync_on_save"`.

## Сводная таблица эндпоинтов

| Метод | Путь | Назначение |
| --- | --- | --- |
| `GET` | `/api/value-links` | Получить список связей (с фильтрами). |
| `POST` | `/api/value-links` | Создать новую связь. |
| `DELETE` | `/api/value-links/{link_id}` | Удалить связь. |
| `POST` | `/api/value-links/check` | Проверить значение по ключу и получить совпадения. |
| `GET` | `/api/value-locks` | Получить список замков. |
| `POST` | `/api/value-locks` | Создать/обновить замок. |
| `DELETE` | `/api/value-locks/{lock_id}` | Снять замок. |

Ниже — детальные контракты.

---

## `GET /api/value-links`

Возвращает список связей, поддерживает выборку по ключу/маске.

### Параметры запроса

- `key` *(optional)* — фильтрует по участию ключа (проверяется как `left_key = key OR right_key = key`).
- `relation` *(optional)* — фильтр по типу связи.
- `limit`, `offset` *(optional)* — пагинация.

### Пример ответа

```json
{
  "items": [
    {
      "id": 42,
      "left_key": "expert_conclusion#1-03.objectName",
      "right_key": "explanatory_note#1-05.objectName",
      "relation": "eq",
      "weight": null,
      "meta": null,
      "created_at": "2025-11-13T18:30:00Z",
      "updated_at": "2025-11-13T18:30:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

## `POST /api/value-links`

Создаёт новую связь между ключами. При наличии дубликата возвращает HTTP `409`.

### Тело запроса

```json
{
  "left_key": "expert_conclusion#1-03.objectName",
  "right_key": "explanatory_note#1-05.objectName",
  "relation": "eq",
  "weight": 10,
  "meta": {
    "confidence": "auto"
  }
}
```

- `left_key` *(required)*
- `right_key` *(required)*
- `relation` *(optional, default `"eq"`)*
- `weight` *(optional)*
- `meta` *(optional JSON)*

### Пример ответа

HTTP `201 Created`:

```json
{
  "id": 107,
  "left_key": "expert_conclusion#1-03.objectName",
  "right_key": "explanatory_note#1-05.objectName",
  "relation": "eq",
  "weight": 10,
  "meta": {
    "confidence": "auto"
  },
  "created_at": "2025-11-13T18:30:00Z",
  "updated_at": "2025-11-13T18:30:00Z"
}
```

---

## `DELETE /api/value-links/{link_id}`

Удаляет связь. При отсутствии записи — HTTP `404`.

Ответ: HTTP `204 No Content`.

---

## `POST /api/value-links/check`

Проверяет текущее значение по ключу и возвращает значения других полей, входящих в ту же «группу связности».

### Тело запроса

```json
{
  "key": "expert_conclusion#1-03.objectName",
  "value": "Жилой дом на ул. Пушкина",
  "context": {
    "object_uid": "OBJ-00123",
    "document_uid": "DOC-00777"
  }
}
```

- `key` *(required)* — путь поля, которое проверяем.
- `value` *(optional)* — текущее значение. Если не передано, сервер попытается получить его из связанного документа.
- `context` *(optional)* — подсказки, какие документы/версии рассматривать.

### Пример ответа

```json
{
  "status": "mismatch",
  "matches": [
    {
      "key": "explanatory_note#1-05.objectName",
      "value": "Жилой дом на ул. Пушкина",
      "source_type": "document",
      "document": {
        "uid": "DOC-00456",
        "title": "Пояснительная записка",
        "version": {
          "id": 912,
          "created_at": "2025-11-01T09:00:00Z"
        }
      }
    },
    {
      "key": "design_assignment#1-00.objectName",
      "value": "Жилой дом на ул. Пушкина",
      "source_type": "document",
      "document": {
        "uid": "DOC-00457",
        "title": "Задание на проектирование",
        "version": {
          "id": 913,
          "created_at": "2025-10-21T10:15:00Z"
        }
      }
    },
    {
      "key": "Object.Title",
      "value": "Жилой дом на ул. Пушкина",
      "source_type": "entity",
      "entity": {
        "type": "Object",
        "id": 321,
        "name": "Объект строительства"
      }
    }
  ],
  "diagnostics": {
    "group_size": 4,
    "checked_documents": 3
  }
}
```

- `status`: `"matched"` | `"mismatch"` | `"empty"`.
- `matches`: массив значений с указанием источника.
- `diagnostics` *(optional)* — техническая информация (размер компоненты, список документов и т.д.).

---

## `GET /api/value-locks`

Возвращает активные замки. Можно фильтровать по `locked_key`.

### Пример ответа

```json
{
  "items": [
    {
      "id": 12,
      "locked_key": "expert_conclusion#1-03.objectName",
      "source_key": "Object.Title",
      "mode": "sync_on_open",
      "comment": null,
      "created_at": "2025-11-13T18:35:00Z",
      "updated_at": "2025-11-13T18:35:00Z"
    }
  ]
}
```

---

## `POST /api/value-locks`

Создаёт или обновляет замок. Если для `locked_key` уже есть запись, она обновляется.

### Тело запроса

```json
{
  "locked_key": "expert_conclusion#1-03.objectName",
  "source_key": "Object.Title",
  "mode": "sync_on_open",
  "comment": "Брать из карточки объекта"
}
```

### Пример ответа

```json
{
  "id": 12,
  "locked_key": "expert_conclusion#1-03.objectName",
  "source_key": "Object.Title",
  "mode": "sync_on_open",
  "comment": "Брать из карточки объекта",
  "created_at": "2025-11-13T18:35:00Z",
  "updated_at": "2025-11-13T18:40:00Z"
}
```

---

## `DELETE /api/value-locks/{lock_id}`

Снимает замок. Ответ: HTTP `204 No Content`.

---

## Коды ошибок

| Код | Описание |
| --- | --- |
| `400` | Некорректный формат ключа / обязательные поля отсутствуют. |
| `404` | Запись не найдена (для `DELETE`). |
| `409` | Связь или замок уже существуют, создание невозможно. |
| `422` | Ошибка валидации входных данных (FastAPI). |
| `500` | Прочие ошибки сервера. |

---

## TODO / будущие расширения

- Режимы блокировок `sync_on_save`, `sync_bidirectional`.
- Дополнительные типы отношений (`approx`, `subset`).
- Поддержка «батч»-проверки нескольких полей.
- Аудит действий (кто создал/удалил мэппинг, когда выполнялась проверка).
