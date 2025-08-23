# Вклад в проект

Спасибо, что хотите помочь развитию **Construction XML Service**!

## Как начать

1. Форкните репозиторий и создайте ветку для вашей задачи:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Поднимите окружение локально:

   ```bash
   docker compose up -d
   ```

   Сервис поднимется вместе с PostgreSQL и MinIO.

3. Выполните миграции:

   ```bash
   docker compose exec app alembic upgrade head
   ```

4. Запустите тесты:

   ```bash
   docker compose exec app pytest -q
   ```

## Стиль кода

* Python 3.11, придерживаемся PEP8.
* Используем `black` для форматирования.
* Типизация: `mypy` и аннотации обязательны.
* Коммиты оформляем в стиле:

  ```
  A2-1: Краткое описание задачи
  ```

## Pull Request

* Перед PR убедитесь, что тесты проходят (`pytest`) и код отформатирован.
* PR должен ссылаться на соответствующий Issue или Milestone.
* В PR описать:

  * Что сделано
  * Как протестировать
  * Замечания или TODO

## Вопросы

Если есть вопросы — используйте [Issues](https://github.com/knoff/construction_xml/issues).