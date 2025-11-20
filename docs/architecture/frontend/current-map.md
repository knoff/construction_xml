# Текущая карта фронтенда

> Статус: в работе (обновляется по мере анализа файлов)

## Структура обзора

1. [app](#app)
2. [components](#components)
3. [features](#features)
   - [Фича docs](#фича-docs)
   - [Фича documents](#фича-documents)
   - [Фича files](#фича-files)
   - [Фича schemas](#фича-schemas)
   - [Фича objects](#фича-objects)
   - [Фича forms-renderer](#фича-forms-renderer)
4. [lib](#lib)
5. [types](#types)
6. [indexcss](#indexcss)
7. [main.tsx](#maintsx)
8. [vite-env.d.ts](#vite-envdts)

Каждый раздел содержит:
- путь файла;
- краткое назначение и слой логики;
- подробный разбор экспортов/функций с параметрами и возвращаемыми значениями;
- используемые внешние зависимости и заметки о смешении слоёв.

---

## Архитектурные «рельсы» (стабилизирующие механизмы)

> Обновление от 19.11.2025. Механизмы зафиксированы и должны применяться ко всем фронтенд-фичам по мере доработок.

- **HTTP-адаптеры (`features/<feature>/adapters`)**
  - Все сетевые вызовы инкапсулируются в адаптеры поверх `axios`-инстанса `@/lib/api`.
  - Адаптеры возвращают типизированные данные и нормализуют ошибки в `Error` (см. `features/documents/adapters/api.ts`).
- **Runtime-хуки (`features/<feature>/runtime`)**
  - Компоненты страниц и модулей получают данные только через runtime-хуки.
  - Библиотека `@tanstack/react-query` используется для загрузки/мутаций, чтобы обеспечить кеширование, инвалидацию и единый контроль состояний загрузки/ошибок.
- **UI-компоненты (`features/<feature>/components`)**
  - Работают с данными, переданными runtime-слоем, не делают сетевых запросов и не управляют глобальным состоянием.
- **Публичные фасады (`features/<feature>/index.ts`)**
  - Экспортируют только те сущности, которые составляют публичный API фичи (страницы, виджеты, контексты).
  - Внешние слои (app, другие фичи) импортируют фичу только через фасад.
- **Контроль импортов**
  - ESLint-конфигурация (`.eslintrc.json`) запрещает «обратные» импорты (например, из компонентов в core других фич) и требует использования `@`-алиаса вместо относительных `../..` при переходе между слоями.

**Текущее состояние внедрения:**

- Новые рельсы уже реализованы для фичи `documents` (адаптеры, runtime-хук, подключение React Query).
- Остальные фичи остаются без изменений до целевых рефакторингов. Для них нужно последовательно повторить структуру: адаптеры → runtime → компоненты.
- Подготовлено отдельное руководство по ревью ([review-guide](./review-guide.md)), где описаны шаги проверки соответствия рельсам.

---

## app

### `frontend/src/app/layouts/RootLayout.tsx`

- **Слой/роль**: runtime (макет приложения, навигация).
- **Зависимости**: `react-router-dom` (`Link`, `NavLink`, `Outlet`).
- **Экспорты**:
  - `RootLayout`: компонент верхнего уровня со структурой страницы и общей навигацией.
  - `default` экспортирует `RootLayout`.
- **Структура компонента**:
  - Рендерит обёртку `div` с минимальной высотой экрана.
  - Шапка (`header`) с навигацией: ссылки на разделы `/schemas`, `/objects`, `/documents`, `/files`, `/docs`.
  - Использует `NavLink` для подсветки активного маршрута, добавляет класс `underline` при активности.
  - Основной контейнер (`main`) выводит дочерние маршруты через `<Outlet />`.
- **Особенности/замечания**:
  - Логика полностью визуальная; бизнес-логики и работы с данными нет.
  - Смешения слоёв не наблюдается.

### `frontend/src/app/router/routes.tsx`

- **Слой/роль**: runtime (конфигурация маршрутов).
- **Зависимости**: тип `RouteObject` из `react-router-dom`, страницы из `features/*` и `RootLayout`.
- **Экспорты**:
  - `routes: RouteObject[]` — массив объектов маршрутов для передачи в роутер Vite/React Router.
- **Описание маршрутов**:
  - `path: "/"` содержит `RootLayout` и дочерние маршруты.
  - `index`: отображает `SchemasListPage`.
  - `/schemas`, `/files`, `/objects`, `/documents`, `/documents/:id/fill`, `/docs` — подключают соответствующие страницы из фич.
- **Особенности/замечания**:
  - Отчётливо выраженный runtime-слой; маршруты напрямую обращаются к страницам из фич.
  - Требует внимания при рефакторинге фасадов: импорт страниц идёт по пути `@/features/.../pages/...` (фасады не используются).

## components

### `frontend/src/components/ui/button.tsx`

- **Слой/роль**: components (переиспользуемый UI).
- **Зависимости**: `React`, `@radix-ui/react-slot` (композиция через Slot), `class-variance-authority` (варианты), утилита `cn` из `@/lib/utils`.
- **Экспорты**:
  - `Button`: компонент-обёртка над `<button>` с поддержкой пропса `asChild`, вариаций `variant` и `size`.
  - `buttonVariants`: функция `cva`, возвращающая классы Tailwind для комбинаций стилей.
- **Сигнатуры**:
  - `Button(props: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) => JSX.Element`
  - `buttonVariants(options?: { variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'; size?: 'default' | 'sm' | 'lg' | 'icon'; className?: string }) => string`
- **Особенности/замечания**:
  - Логика полностью визуальная.
  - `asChild` позволяет рендерить любой компонент-ребёнок (например, `<Link>`) с кнопочными стилями.
  - Зависит от `cn` (потенциальная связь с `lib/utils`).

### `frontend/src/components/ui/calendar.tsx`

- **Слой/роль**: components (комплексный UI-компонент календаря).
- **Зависимости**: `React`, `react-day-picker` (DayPicker/DayButton), иконки `lucide-react`, локальные `Button`/`buttonVariants`, `cn`.
- **Экспорты**:
  - `Calendar(props: DayPickerProps & { buttonVariant?: ButtonVariant }) => JSX.Element` — обёртка над `DayPicker` с переопределением классов/компонентов.
  - `CalendarDayButton(props: React.ComponentProps<typeof DayButton>) => JSX.Element` — кастомная кнопка дня.
- **Структура `Calendar`**:
  - Применяет Tailwind-классы к `DayPicker`, позволяет изменять `captionLayout`, передавать `classNames`, `components`, `formatters`.
  - Переопределяет `classNames` `react-day-picker` через `cn`, добавляя дизайн-системные стили.
  - В `components` подменяет `Root`, `Chevron`, `DayButton`, `WeekNumber`.
- **Структура `CalendarDayButton`**:
  - Создаёт ref, фокусируется при `modifiers.focused`.
  - Рендерит `Button` с набором `data-*` атрибутов, Tailwind-классов для selected/range состояний.
- **Особенности/замечания**:
  - Компонент насыщен визуальными стилями, логика ограничена UI-поведением.
  - Сильно зависит от дизайн-системы (`buttonVariants`, `cn`), но бизнес-логики нет.
  - Возможен вынос повторяющихся констант классов, но в текущем виде соответствует слою components.

### `frontend/src/components/ui/card.tsx`

- **Слой/роль**: components (атомарные UI-блоки).
- **Зависимости**: `React`, утилита `cn`.
- **Экспорты**:
  - `Card(props: React.HTMLAttributes<HTMLDivElement>)` — контейнер с закруглёнными краями и границей.
  - `CardHeader`, `CardContent`, `CardFooter` — секции карточки с базовыми отступами и границами.
- **Особенности/замечания**:
  - Полностью визуальный слой, логика ограничена стилизацией.
  - Использование `cn` для комбинирования Tailwind-классов.

### `frontend/src/components/ui/data-table.tsx`

- **Слой/роль**: components + частично runtime (объединяет UI и состояние таблицы).
- **Зависимости**: `React` (включая `useState`), `@tanstack/react-table` (табличная логика), локальные `Table`, `DropdownMenu`, `cn`.
- **Экспорт**: `DataTable<TData, TValue>(props) => JSX.Element` — универсальный компонент таблицы с пагинацией, управлением колонками и действиями.
- **Пропсы**:
  - `columns`: `ColumnDef<TData, TValue>[]` — описание колонок.
  - `data`: `TData[]` — строки.
  - `columnsTitle`, `initialVisibility`, `initialSizing`, `initialPageSize`, `pageSizeOptions`, `rightActions`, `className`.
- **Внутреннее состояние**:
  - `columnVisibility`, `columnSizing`, `pageSize`, `pageIndex` через `React.useState`.
  - Использует `useReactTable` для вычисления моделей строк, пагинации и размеров.
- **Рендер**:
  - Заголовок с переключателем колонок (`DropdownMenu`) и правой панелью действий.
  - Таблица на базе компонентов `Table`, `TableHeader`, `TableBody` и `flexRender` для ячеек.
  - Сообщение «Нет данных», если строки отсутствуют.
  - Панель пагинации с выбором размера страницы и управлением страницами.
- **Особенности/замечания**:
  - Здесь присутствует смешение UI и runtime: компонент хранит локальное состояние, управляет пагинацией и подписывается на изменения таблицы.
  - Поддерживает динамическое скрытие колонок через меню.
  - Стоит рассмотреть вынос части логики (например, локализации, текста заголовков) при дальнейшем рефакторинге.

### `frontend/src/components/ui/dropdown-menu.tsx`

- **Слой/роль**: components (обёртка над Radix UI для меню).
- **Зависимости**: `React`, `@radix-ui/react-dropdown-menu`, иконки `lucide-react` (используются в некоторых местах через импорт), `cn`.
- **Экспорты**:
  - Переэкспорт базовых сущностей Radix (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuPortal`, `DropdownMenuGroup`, `DropdownMenuSub`, `DropdownMenuRadioGroup`).
  - Обёртки `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel` с преднастроенными классами.
- **Обёртки**:
  - `DropdownMenuContent`: `forwardRef` → `DropdownMenuPrimitive.Content` внутри `Portal`, задаёт отступ `sideOffset` и классы.
  - `DropdownMenuItem`: добавляет базовые состояния `focus` и `disabled`.
  - `DropdownMenuSeparator`: визуальная линия.
  - `DropdownMenuLabel`: стилизованный заголовок группы.
- **Особенности/замечания**:
  - Логика сведена к стилизации; бизнес-содержимого нет.
  - Использует `forwardRef` для совместимости с Radix.
  - Удобен как часть дизайн-системы; при рефакторинге может быть вынесен в `components` фасад.

### `frontend/src/components/ui/dialog.tsx`

- **Слой/роль**: components + runtime UI (модальное окно на Radix).
- **Зависимости**: `React`, `@radix-ui/react-dialog`, `lucide-react` (иконка `X`), `cn`.
- **Экспорты**:
  - Базовые сущности Radix (`Dialog`, `DialogTrigger`, `DialogClose`).
  - Обёртки `DialogPortal`, `DialogOverlay`, `DialogContent` с преднастроенными стилями и логикой (включая кнопку закрытия).
  - Структурные блоки `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter`.
- **Особенности реализации**:
  - `DialogContent` оборачивает Overlay и Content внутри `Portal`, добавляет кнопку закрытия (`DialogPrimitive.Close`) с иконкой.
  - Tailwind-классы задают размеры, позиционирование, фон и эффекты для модалки.
  - `DialogBody` делает внутреннюю прокрутку через `overflow-auto`.
- **Особенности/замечания**:
  - Чистый UI-код; бизнес-логики нет. Хранение состояния происходит у вызывающей стороны.
  - Использование `forwardRef` обеспечивает совместимость с Radix.
  - Присутствует хардкод в цветах (серый фон для Header/Title) — стоит учесть при дальнейшей кастомизации дизайн-системы.

### `frontend/src/components/ui/input.tsx`

- **Слой/роль**: components (атомарный UI элемент формы).
- **Зависимости**: `React`, `cn`.
- **Экспорт**: `Input` — `forwardRef<HTMLInputElement>` с базовыми Tailwind-классами для типового поля ввода.
- **Особенности/замечания**:
  - Принимает все стандартные HTML-пропсы поля ввода.
  - Чистая визуальная логика, без внутренних состояний.
  - Использует переменную `--radius` из темы.

### `frontend/src/components/ui/label.tsx`

- **Слой/роль**: components (атомарная подпись).
- **Зависимости**: `React`, `cn`.
- **Экспорт**: `Label(props: LabelProps) => JSX.Element` — простая обёртка над `<label>` с базовым классом.
- **Особенности/замечания**:
  - Визуальный слой без логики.
  - Используется совместно с `Input` и другими формами.

### `frontend/src/components/ui/popover.tsx`

- **Слой/роль**: components (Radix popover с обёртками).
- **Зависимости**: `React`, `@radix-ui/react-popover`, `cn`.
- **Экспорты**:
  - `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` — обёртки над соответствующими примитивами Radix с `data-slot` атрибутами и базовыми стилями.
- **Особенности/замечания**:
  - `PopoverContent` настраивает анимации открытия/закрытия и размеры.
  - Чистый UI-компонент; состояние контролируется извне.
  - Использование `Portal` для рендеринга поверх остального UI.

### `frontend/src/components/ui/table.tsx`

- **Слой/роль**: components (атомы таблицы).
- **Зависимости**: `React`, `cn`.
- **Экспорты**:
  - `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` — простые обёртки над HTML-элементами с Tailwind-классами.
- **Особенности/замечания**:
  - Используются как фундаментальные блоки для `DataTable` и других списков.
  - Логика отсутствует, только стилизация.

## features

### Фича `docs`

Назначение: отображение внутренней документации проекта (Markdown-файлы) с навигацией и просмотрщиком.

#### `frontend/src/features/docs/components/pages/DocsPage.tsx`

- **Слой/роль**: components/pages — тонкая страница.
- **Экспорт**: компонент `DocsPage()` — возвращает `<DocsLayout />`.
- **Особенности**: никакой собственной логики, полагается на модуль `layout`.

#### `frontend/src/features/docs/modules/layout/index.ts`

- **Слой/роль**: modules/layout — фасад подмодуля.
- **Экспорт**: реэкспорт `DocsLayout`.

#### `frontend/src/features/docs/modules/layout/components/Layout.tsx`

- **Слой/роль**: components (подмодуль layout).
- **Экспорт**: `DocsLayout()` — React-компонент, состоящий из заголовка и `<DocsViewer />`.
- **Особенности**: чистый UI, без бизнес-логики; служит связующим звеном между страницей и просмотрщиком документации.

#### `frontend/src/features/docs/modules/navigation/core/types.ts`

- **Слой/роль**: core.
- **Экспорты**:
  - `DocsNavigationItem` — структура узла (`title`, `path?`, `match?`, `children?`).
  - `DocsNavigation` — корневой объект (`title`, `items`).
- **Особенности**: доменные типы для навигации; других сущностей в core нет.

#### `frontend/src/features/docs/modules/navigation/adapters/navigation.ts`

- **Слой/роль**: adapters (API).
- **Зависимости**: `api` из `@/lib/api`, типы из core.
- **Экспорты**:
  - `fetchDocsNavigation(): Promise<DocsNavigation>` — GET `/docs/navigation`.
  - Реэкспорт типов `DocsNavigation`, `DocsNavigationItem`.
- **Особенности**: чистый HTTP-адаптер; ошибок не обрабатывает (ожидается, что вызывающая сторона поймает исключения Axios).

#### `frontend/src/features/docs/modules/navigation/components/NavigationSidebar.tsx`

- **Слой/роль**: components + runtime (UI + управление состоянием дерева навигации).
- **Экспорты**: `DocsNavigationSidebar(props)` — главный компонент боковой навигации.
- **Внутренние сущности**:
  - `NavigationNode`, `NavNodeMeta`, `ActiveAnalysis` — локальные типы.
  - `buildNavigationStructure(items)` — рекурсивно собирает дерево с идентификаторами и метаданными. Возвращает `{ nodes, metaList }`.
  - `calculateMatchScore(item, activePath)` — числовая оценка соответствия текущего пути; используется для автоматического раскрытия.
  - `analyzeActiveState(activePath, metaList)` — определяет активный узел и набор автоматически раскрытых ID.
  - `DocsNavigationSidebar({ navigation, activePath, onSelect })` — основной компонент (hooks, состояние `expandedOverrides`).
  - `DocsNavigationList` — рекурсивный рендер уровней списка.
  - `DocsNavigationNode` — элемент дерева с кнопками раскрытия и выбора.
- **Состояние/эффекты**:
  - `useMemo` для построения дерева и активного состояния.
  - `useState` для переопределений раскрытия (`expandedOverrides`).
  - `useEffect` для сброса раскрытий при смене навигации.
- **Особенности**:
  - Заметное смешение UI и runtime: компонент управляет состоянием раскрытости, автоподсветкой, хранит мемоизированные структуры.
  - Реализация сложной логики сопоставления пути с деревом; следует при рефакторинге вынести часть в runtime-хуки.

#### `frontend/src/features/docs/modules/navigation/components/index.ts`

- **Слой/роль**: фасад подмодуля components.
- **Экспорт**: `DocsNavigationSidebar`.

#### `frontend/src/features/docs/modules/viewer/adapters/content.ts`

- **Слой/роль**: adapters.
- **Экспорт**: `fetchDocsContent(path?)` — GET `/docs/index` или `/docs/file`, возвращает строку (markdown).
- **Особенности**: обрабатывает `responseType: "text"`, но ошибок не перехватывает.

#### `frontend/src/features/docs/modules/viewer/runtime/DocsViewer.tsx`

- **Слой/роль**: runtime (интеграция с роутером, состояния, загрузки).
- **Зависимости**: `React`, `react-markdown`, `remark-gfm`, `react-router-dom` (`useSearchParams`), иконки `lucide-react`, адаптеры `fetchDocsContent`, `fetchDocsNavigation`, компонент `DocsNavigationSidebar`.
- **Основные состояния**:
  - `navigation`, `navError`, `navLoading` — для структуры навигации.
  - `content`, `contentError`, `contentLoading` — для Markdown.
  - История просмотра: `historyRef`, `historyIndex`, `pendingHashRef`.
- **Функции**:
  - `classifyLink(href, currentPath)` — определяет тип ссылки (`external`, `anchor`, `internal`, `unknown`). Используется для обработки ссылок внутри markdown.
  - `loadNavigation`, `loadContent` — async функции с обработкой ошибок и обновлением состояний.
  - `scrollToHash(hash)` — плавная прокрутка к якорю.
  - `pushHistory(entry)` — управление стеком истории.
  - `navigateToDoc(path, hash?, options?)` — переключение активного документа/якоря, обновление `searchParams` и скролла.
  - `handleSelect`, `handleBack`, `handleForward` — обработчики UI.
- **Рендер**:
  - Макет `aside` (навигация) + `article` (контент).
  - Управляет загрузкой/ошибками, отображает markdown через `ReactMarkdown` с кастомным компонентом `a`.
- **Особенности**:
  - Значительная бизнес-логика в runtime-слое: история, анализ ссылок, управление `searchParams`.
  - Сильная связка с адаптерами; при рефакторинге можно выделить runtime-хуки (`useDocsNavigation`, `useDocsContent`).

#### `frontend/src/features/docs/modules/viewer/runtime/index.ts`

- **Слой/роль**: фасад runtime-подмодуля.
- **Экспорт**: `DocsViewer`.

### Фича `documents`

Назначение: управление документами (список, создание/редактирование, заполнение форм, версии, UI-оверрайды).

#### `frontend/src/features/documents/index.ts`

- **Слой/роль**: фасад фичи.
- **Экспорты**:
  - Страницы `DocumentsListPage`, `DocumentFillPage`.
  - Компонент-утилита `makeDocumentColumns`, тип `DocumentRow`.
  - Типы из `core/types.ts` и контексты/провайдеры из `core/contexts.ts`.
- **Особенности**: используется в других фичах (forms-renderer) для доступа к контекстам. После рефакторинга предполагается сведение внешних импортов к фасаду.

#### `frontend/src/features/documents/core/types.ts`

- **Слой/роль**: core (доменные типы).
- **Экспорты**:
  - `DocumentObjectRef`, `DocumentSchemaRef`, `DocumentSummary`, `DocumentVersion`, `DocumentDetails` — описывают сущности документов и версий.
  - `ObjectOption`, `SchemaOption`, `DocumentCreatePayload` — вспомогательные типы для форм выбора объекта/схемы.
- **Особенности**: только типы, логики нет. Используются в адаптерах, компонентах и внешних фичах.

#### `frontend/src/features/documents/core/contexts.tsx`

- **Слой/роль**: core/runtime-гибрид (React-контексты, обслуживающие UI-оверрайды и метаданные документа).
- **Экспорты**:
  - Типы `UiOverrides`, `UiOverridesContextValue`, `DocumentMeta`.
  - Провайдеры/хуки `UiOverridesProvider`, `useUiOverrides`, `DocumentMetaProvider`, `useDocumentMeta`.
- **Особенности**:
  - Контексты используются как внутри фичи, так и в других модулях (`forms-renderer`).
  - `useUiOverrides`/`useDocumentMeta` бросают ошибку при использовании вне провайдеров.
  - Логика по сути runtime (React), однако файл размещён в `core` — смешение слоёв, требующее внимания в целевом рефакторинге.

#### `frontend/src/features/documents/adapters/api.ts`

- **Слой/роль**: adapters (HTTP API для документов, схем, объектов, версий, UI-оверрайдов).
- **Экспорты**:
  - `fetchDocuments`, `fetchDocument`, `createDocument`, `updateDocument`, `deleteDocument`.
  - Операции с версиями: `fetchDocumentVersions`, `fetchDocumentVersion`, `createDocumentVersion`, `updateDocumentVersionPayload`, `selectDocumentVersion`, `freezeDocumentVersion`, `unfreezeDocumentVersion`.
  - Справочники: `fetchObjects`, `fetchSchemas`.
  - Доступ к схеме: `fetchSchemaInternalModel`, `fetchSchemaUiOverrides`, `updateSchemaUiOverrides`.
- **Особенности**:
  - Все функции используют общий экземпляр Axios `api`; ошибки приводятся к `Error` через `toError`.
  - Адаптер покрывает практически весь сетевой слой, однако страницы пока напрямую обращаются к `fetch` — необходимо перевести их на эти функции.

#### `frontend/src/features/documents/components/DocumentsTable.tsx`

- **Слой/роль**: components (UI-таблица).
- **Экспорты**: `DocumentRow` (тип данных строки), `makeDocumentColumns(opts)` — генератор колонок для `DataTable`.
- **Особенности**:
  - Использует `DropdownMenu` и `navigator.clipboard` (копирование ID).
  - Колонки завязаны на колбэки (`onView`, `onEdit`, `onDelete`, `onFill`, `onVersions`).
  - Визуальный слой чистый, состояние управляется снаружи.

#### `frontend/src/features/documents/components/pages/DocumentsListPage.tsx`

- **Слой/роль**: components/pages, но содержит значительную runtime-логику.
- **Описание**:
  - Импортирует `useDocumentsListPage` из `runtime/useDocumentsListPage` (на данный момент файл пустой — см. ниже), ожидая получить все данные/хендлеры.
  - Рендерит `DataTable` и пять `Dialog` (создание, просмотр, редактирование, удаление, версии).
  - Перечисление возвращаемых значений предполагаемого runtime-хука (`data`, `error`, `createDialog`, `handleCreate`, `versionsState`, и т.д.).
- **Особенности/замечания**:
  - Фактическая логика (fetch, стейты) пока остаётся в компоненте: прежний код не удалён, но ожидается перенос в runtime-хук.
  - Требуется синхронизировать с реальной реализацией `useDocumentsListPage` (сейчас отсутствует, import приводит к ошибке).
  - Много дублирующего UI-кода (формы select, кнопки) — кандидаты на вынос в компоненты.

#### `frontend/src/features/documents/components/pages/DocumentFillPage.tsx`

- **Слой/роль**: components/pages, но содержит бизнес- и runtime-логику.
- **Основные элементы**:
  - Состояния: `doc`, `model`, `err`, `saving`, `errors`, `uiOverrides`, `uiDirty`.
  - Функции: `loadAll(docId, versionId?)` — цепочка `fetch` для документа/версий/схемы/UI-оверрайдов; `saveUiOverrides`, `saveNewVersion`.
  - Использует `RenderRoot`, `ValueLinkProvider`, `MappingDialogProvider`, `UiOverridesProvider`, `DocumentMetaProvider`.
  - Обрабатывает валидацию через `validateModel`, использует `useFormState` из forms-renderer.
- **Особенности/замечания**:
  - Прямые `fetch` вызовы к `/api` — необходимо перенести в `adapters/api.ts` и runtime-хук.
  - Значительное смешение слоёв (React-логика, сетевой доступ, бизнес-правила) внутри компонента.
  - Кнопки лисят на `alert`; отсутствует централизованный UX поведения ошибок.

#### `frontend/src/features/documents/runtime/useDocumentsListPage.ts`

- **Слой/роль**: runtime (должен инкапсулировать бизнес- и сетевую логику списка документов).
- **Текущее состояние**: файл содержит только маркер `***` (последствие незавершённого рефакторинга) и не экспортирует хук.
- **Последствия**: импорт в `DocumentsListPage` приводит к ошибкам TypeScript/Runtime. При анализе следует учесть необходимость восстановления хука с переносом логики из страницы.

#### `frontend/src/features/documents/adapters` / `components/pages` / `runtime`

- **Общая картина слоёв**:
  - Адаптеры: готовы, но не подключены страницами.
  - Runtime: отсутствует (хук не реализован).
  - Компоненты: перегружены логикой (создание, редактирование, версия, fetch).
- **Дополнительные связи**:
  - Контексты `UiOverridesProvider` и `DocumentMetaProvider` используются в `forms-renderer` (hooks `useValueLinks`, runtime `useUiMeta` и т.д.).
  - `DocumentFillPage` тесно интегрирована с `forms-renderer` (runtime `RenderRoot`, `MappingDialogProvider`).
- **Рекомендации для целевого состояния**: вынести API-вызовы и состояние в runtime-хуки (`useDocumentsListPage`, `useDocumentFillPage`), оставить страницы «тонкими» UI-компонентами, выровнять расположение контекстов по слоям.

### Фича `files`

Назначение: список файлов по объектам, управление версиями, загрузка новых файлов и подписей.

#### `frontend/src/features/files/columns.tsx`

- **Слой/роль**: components (табличная конфигурация).
- **Экспорты**:
  - `FileRow` — тип данных строки.
  - `makeFileColumns(actions)` — возвращает массив колонок для `DataTable`, использует `DropdownMenu` для действий.
  - `initialFilesVisibility`, `initialFilesSizing` — настройки отображения/ширины колонок.
- **Особенности**:
  - Колонки завязаны на колбэки (`onCopyId`, `onOpenVersions`, `onOpenMeta` и т.д.).
  - Визуальный слой; бизнес-логика и сетевые вызовы остаются в странице.

#### `frontend/src/features/files/components/UploadDialog.tsx`

- **Слой/роль**: components (самодостаточный диалог загрузки файлов).
- **Экспорт**: `UploadDialog(props)` — принимает `open`, `onOpenChange`, `onUpload`, ограничения (`accept`, `mime`, `maxSizeBytes`), тексты.
- **Логика**:
  - Локальные состояния: выбранные файлы, ошибки, busy, drag state.
  - Валидация размера/расширения/MIME (`validateFiles`).
  - Обработчики Drag&Drop, клавиатуры, сброса состояний при закрытии.
- **Особенности**: компонент чисто UI + локальная логика, сетевые запросы делегируются через `onUpload`.

#### `frontend/src/features/files/pages/FilesListPage.tsx`

- **Слой/роль**: components/pages, но содержит обширную бизнес-логику и сетевые вызовы.
- **Состояния**:
  - Основные: `data`, `err`, `objectFilter`, `objects` (список объектов), диалоги загрузки/редактирования/удаления/версий, ошибки `uploadErr`, `modalErr`, `verr`, `upErr`, `busyDelId` и др.
  - Использует `useState`, `useEffect`, `useMemo` для управления жизненным циклом.
- **Функции**:
  - `reload`, `reloadVersions` — напрямую вызывают `fetch` (`/api/files/...`, `/api/objects`).
  - Обработчики для UploadDialog (создание файла, новая версия, загрузка подписи), удаления, редактирования метаданных.
- **Рендер**:
  - Выпадающий список объектов, таблица `DataTable` с колонками из `makeFileColumns`.
  - Множество вложенных диалогов: `UploadDialog`, `VersionsDialog`, `EditMetaDialog`, `ConfirmDelete`.
- **Особенности/замечания**:
  - Смешение слоёв: страница отвечает и за UI, и за сетевые запросы, и за бизнес-логику.
  - Нет разделения на runtime-хуки и адаптеры; повторяется обращение к `/api` по `fetch`.
  - Внутренние диалоги (EditMetaDialog, ConfirmDelete, VersionsDialog, RowTip) определены в том же файле, усиливая монолитность.
- **Рекомендации**: вынести сетевую логику в adapters/runtime, выделить подмодули для модалок, привести страницу к тонкому UI.

### Фича `schemas`

Назначение: управление XSD-схемами — просмотр списка, загрузка, редактирование, удаление.

#### `frontend/src/features/schemas/columns.tsx`

- **Слой/роль**: components (конфигурация таблицы).
- **Экспорты**: тип `SchemaRow`; функция `makeSchemaColumns({ onView, onEdit, onDelete })`.
- **Особенности**: аналогична `documents`/`files` — чистый UI без состояния; использует `DropdownMenu` и `formatDateTime`.

#### `frontend/src/features/schemas/SchemaViewDialog.tsx`

- **Слой/роль**: components (диалог просмотра).
- **Логика**:
  - Состояния `loading`, `error`, `item`.
  - `useEffect` при открытии вызывает `fetch(/api/schemas/:id)`.
  - Отображает метаданные схемы и JSON-представление.
- **Особенности**: прямой `fetch` в компоненте → смешение UI и сетевой логики; ошибок/состояний нет в adapters/runtime.

#### `frontend/src/features/schemas/SchemaEditDialog.tsx`

- **Слой/роль**: components/runtime (редактирование схемы).
- **Логика**:
  - Состояния `loading`, `saving`, `error`, `item`, `types`.
  - `useEffect` загружает данные схемы и список типов (`/api/schemas/:id`, `/api/schemas/types`).
  - Функция `save()` отправляет `PUT /api/schemas/:id`.
- **Особенности**: повторяет проблему смешения слоёв — сетевые вызовы и бизнес-логика внутри компонента, отсутствуют adapters/runtime.

#### `frontend/src/features/schemas/pages/SchemasListPage.tsx`

- **Слой/роль**: components/pages + runtime.
- **Состояния**: `data`, `err`, `viewId`, `viewOpen`, `editId`, `editOpen`, `confirm*`, `uploadOpen`.
- **Функции**:
  - `reload()` — `fetch /api/schemas` (без обработки ошибок кроме `catch`).
  - Обработчики для просмотра, редактирования, удаления, загрузки XSD.
- **Рендер**: таблица `DataTable` + диалоги `SchemaViewDialog`, `SchemaEditDialog`, `Dialog` удаления, `UploadDialog` (из features/files).
- **Особенности**:
  - Все сетевые вызовы (`/api/schemas`, `/api/schemas/upload`, `/api/schemas/delete`) находятся в странице/диалогах.
  - Повторяющиеся элементы (Dialog, UploadDialog) используются без вынесения в отдельные слои.
  - Аналогично другим фичам требуется разделение на adapters/runtime/hooks.

### Фича `objects`

Назначение: справочник объектов, используемых при работе с документами и файлами.

#### `frontend/src/features/objects/columns.tsx`

- **Слой/роль**: components (табличная конфигурация).
- **Экспорты**: `ObjectRow`, `makeObjectColumns({ onView, onEdit, onDelete })`.
- **Особенности**: структура аналогична другим таблицам; UI без состояния, завязан на колбэки.

#### `frontend/src/features/objects/pages/ObjectsListPage.tsx`

- **Слой/роль**: components/pages + runtime.
- **Состояния**: `data`, `err`, диалоги просмотра/редактирования/удаления/создания (`view*`, `edit*`, `confirm*`, `createOpen`), служебные `confirmDocsCount`, `confirmDeleteDocs`.
- **Функции**:
  - `reload()` — `fetch /api/objects/`.
  - При удалении дополнительно запрашивает `/api/objects/:id/documents/count`.
  - POST/PATCH/DELETE при создании/редактировании/удалении.
- **Рендер**: таблица `DataTable` + набор `Dialog` для CRUD (все прямо внутри файла).
- **Особенности**:
  - Сильное смешение UI и сетевой логики (все запросы через `fetch` прямо в компоненте).
  - Нет adapters/runtime-слоя, диалоги и логика сосредоточены в одной странице.
  - Существует зависимость от `files`/`documents` (например, удаление может затронуть документы) — требует координации при рефакторинге.

### Фича `forms-renderer`

Назначение: визуализация форм по XSD-модели, включая маппинг, UI-оверрайды и валидацию.

#### Общая структура

- `core/` — типы и базовые утилиты (например, `core/types.ts`, `core/utils/path.ts`, `core/utils/errors.ts`).
- `hooks/` — вспомогательные хуки верхнего уровня (`useValueLinks.tsx`, зависящий от `documents`).
- `modules/`
  - `mapper/` — диалоги сопоставления, store, API (`modules/mapper/runtime/store.tsx`, `modules/mapper/adapters/api.ts`).
  - `renderer/` — основной движок рендера: компоненты (`components/`), core-утилиты (`core/`), runtime (`runtime/`).
  - `ui-overrides/` — управление UI-компонентами и надстройками (components, modules/*, runtime/registry.ts, core/types.ts).
  - `validator/` — логика валидации модели (`modules/validator/core/validateModel.ts`).

#### Ключевые файлы

- `modules/renderer/runtime/RenderRoot.tsx`
  - **Слой/роль**: runtime.
  - Использует контексты (`FormStateCtx`, `LabelOverridesCtx`) и `useUiOverrides` из `documents`.
  - Управляет состоянием `LabelEditorDialog`, интегрируется с `Mapper` (`MappingDialog`).
  - Сильная связанность с `documents` и `forms-renderer` контекстами.

- `modules/renderer/runtime/useFormState.ts`
  - **Слой/роль**: runtime-хук, инкапсулирующий `useState` + операции `setPath`, `delPath` (использует утилиты `core/utils/path`).

- `modules/renderer/components/FieldBlock.tsx` и блоки (`blocks/*.tsx`)
  - **Слой/роль**: components (рендер элементов формы).
  - Содержат рекурсивный рендер, опираются на runtime-хуки и утилиты.
  - Зависимы от типов, ошибок, UI-оверрайдов.

- `modules/ui-overrides/runtime/registry.ts`
  - **Слой/роль**: runtime-утилита выбора компонентов.
  - Функции `canUseComponent`, `firstAllowedComponentFor`, используются в SimpleInput и др.
  - Отмечено текущее несоответствие: `canUseComponent` ожидает `args: { f, isBlock }`, что конфликтует с вызовами в `useUiMeta.ts` (см. ниже).

- `modules/ui-overrides/core/types.ts`
  - **Слой/роль**: core типы UI-компонентов.

- `modules/renderer/runtime/useUiMeta.ts`
  - **Слой/роль**: runtime-хук (определяет выбранный UI-компонент для path).
  - Текущее состояние: использует `ui.updateWidgets`, которого нет в `UiOverridesContextValue` (см. `documents/core/contexts.ts`). В TypeScript-линте числятся ошибки — требуется исправление контракта контекста/хука.

- `modules/renderer/components/inputs/SimpleInput.tsx`
  - **Слой/роль**: components.
  - Прямо обращается к `useUiOverrides`, использует `UI_COMPONENTS`, fallback-логика разветвляет по типам полей.
  - Пример сильной связанности с `documents` (контекст) и `ui-overrides` (регистры компонентов).

- `modules/mapper` и `modules/ui-overrides/modules/*`
  - Содержат сложные вложенные компоненты (например, `modules/ui-overrides/modules/files/components/TFileBlock.tsx`), тесно связанные с `documents` (используют `useDocumentMeta`, `useUiOverrides`).

#### Особенности и замечания

- Вся фича тесно переплетена с `documents` (контексты, фасад). Любые изменения в документах напрямую влияют на формы.
- Большая часть бизнес-логики расположена в runtime-компонентах (`RenderRoot`, `DocsViewer`, `useUiMeta`) без явного выделения адаптеров; сетевые части (`mapper/adapters/api.ts`) присутствуют, но стоит проверить их интеграцию.
- Необходимо устранить несоответствие интерфейсов между `UiOverridesContextValue` (documents) и `useUiMeta`/другими runtime-хуками forms-renderer (обновить контракт или адаптировать код).
- Стоит документировать иерархию контекстов и зависимости между подмодулями при дальнейшем планировании рефакторинга (вынесение общих частей, стабилизация API фасада).

## lib

### `frontend/src/lib/api.ts`

- **Назначение**: единая настройка Axios-клиента с базовым URL `/api`.
- **Слой/роль**: adapters helper (используется адаптерами фич, например, `documents/adapters/api.ts`).
- **Особенности**: комментарии фиксируют ожидание прокси Vite в dev и общий origin в prod. Нет перехватчиков/авторизации — следует учитывать при расширении.

### `frontend/src/lib/api/errors.ts`

- **Назначение**: базовый нормализатор HTTP-ошибок (`toHttpError`) и тип `HttpError`.
- **Слой/роль**: adapters helper — единая точка преобразования Axios/неизвестных ошибок в контролируемый объект.
- **Особенности**: инкапсулирует статус, detail и оригинальную ошибку; фасады фич при рефакторинге должны использовать его вместо собственных `toError`.

### `frontend/src/lib/format.ts`

- **Назначение**: утилиты форматирования.
- **Экспорт**: `formatDateTime(value)` — безопасно преобразует ISO-дату в формат `ru-RU` (dd.mm.yyyy hh:mm:ss), возвращает исходную строку при ошибке.
- **Использование**: таблицы документов/схем/файлов.

### `frontend/src/lib/utils.ts`

- **Назначение**: вспомогательные функции UI (например, `cn` для объединения классов). *Файл ранее не анализировался — см. TODO ниже*.
- **Рекомендация**: при полном рефакторинге убедиться в соответствии стилю и необходимости каждой утилиты.

### `frontend/src/lib/i18n/index.ts`

- **Назначение**: каркас контекста локализации (`I18nProvider`, `useI18n`, `useTranslation`).
- **Слой/роль**: runtime infrastructure (общий для всего фронтенда).
- **Особенности**: ориентирован на русскоязычный интерфейс; используется для локализации текстов из внешних источников (ответы сервера, библиотеки), а не для полноценной мультиязычности. Пока предоставляет словари ключ → строка; планируется расширение (pluralization, namespaces) по мере внедрения в фичи.

### `frontend/src/lib/ui/table/index.ts`

- **Назначение**: каркас контроллера состояния таблицы (`useTableController`).
- **Слой/роль**: runtime helper для UI-компонентов (например, `components/ui/data-table`).
- **Особенности**: управляет видимостью колонок; в будущем возможно дополнение пагинацией и сортировкой, после чего страницы будут подключать общий контроллер вместо локального state.

## types

### `frontend/src/types/markdown.d.ts`

- **Назначение**: декларация типов для импорта `.md` файлов (если используется). Обеспечивает совместимость с TypeScript.

### `frontend/src/vite-env.d.ts`

- **Назначение**: стандартный файл Vite с объявлением типов окружения (`/// <reference types="vite/client" />`).

## index.css

- Содержит глобальные стили, Tailwind directives, переменные темы. *Подробный анализ опущен, поскольку файл большой; при дальнейшей работе вынести ключевые переменные в документацию по стилям.*

## main.tsx

- Точка входа фронтенда (ReactDOM.createRoot, `RouterProvider` и т.п.). *Следует добавить в дальнейшем точное описание, если потребуется.*

## vite-env.d.ts

- См. раздел types выше (объединено).

## Функциональные блоки (сводка)

1. **Навигация и документы (`docs`)**
   - Поставляет документацию, навигацию по Markdown-файлам. Содержит adapters/runtime, тесно связан с `documents` (контексты) и `forms-renderer` косвенно (через общую навигацию).
2. **Работа с документами (`documents`)**
   - Фокус на доменных моделях, версиях, UI-оверрайдах. Контексты `UiOverrides`/`DocumentMeta` экспортируются наружу и используются `forms-renderer`.
3. **Файлы (`files`)**
   - Управление файлами и версиями. Монолитная страница со множеством диалогов; требуется выделение adapters/runtime.
4. **Схемы (`schemas`)**
   - Список XSD, загрузка/редактирование. Диалоги просмотра/редактирования, `UploadDialog` переиспользуется из `files`.
5. **Объекты (`objects`)**
   - Справочник объектов, влияющий на документы/файлы. Текущая реализация держит сетевую логику в компонентах.
6. **Forms Renderer (`forms-renderer`)**
   - Крупный блок с подмодулями (renderer, mapper, ui-overrides, validator). Главный потребитель контекстов `documents`. Требует синхронизации интерфейсов `UiOverrides`.
7. **Core UI-компоненты (`components/ui`)**
   - Базовая дизайн-система (Button, Dialog, DataTable и т.д.), зависящая от `lib/utils` и Radix.
8. **Инфраструктура (`app`, `lib`, `types`, `index.css`, `main.tsx`)**
   - Маршруты, макет приложения, утилиты, глобальные стили, точка входа.

### Основные наблюдения

- Во всех крупных фичах (documents, files, schemas, objects) **страницы перегружены бизнес- и сетевой логикой**. Адаптеры частично созданы только у `documents`; остальным предстоит перенос fetch в adapters/runtime.
- **`forms-renderer`** опирается на контексты `documents`. Необходимо согласовать контракт `UiOverridesContextValue` (добавить `updateWidgets` или скорректировать хуки) — сейчас это источник ошибок при сборке (`npm run build`).
- **Фасады**: лишь у `documents` есть `index.ts`. Остальным фичам потребуется аналог для согласованного API.
- **Повторяющиеся UI-диалоги** (UploadDialog, Dialogs в schemas/objects/files) стоит вынести в отдельные компоненты/слой.
- **lib/utils.ts** и глобальные стили пока не описаны подробно — нужно дополнить карту при необходимости.

## TODO / Следующие шаги

1. Дополнить описание `lib/utils.ts`, `index.css`, `main.tsx` конкретными деталями (при анализе кода).
2. Для каждого блока сформировать целевое состояние (последующая задача).
3. Починить `documents/runtime/useDocumentsListPage.ts` и интерфейс `UiOverrides` перед повторным `npm run build`.
4. Перевести фичевые адаптеры на `@/lib/api/errors` и внедрить общий `useTableController`/`I18nProvider`.

## Связанные документы

- [Общий обзор фронтенд-архитектуры](frontend.md)
- [Руководство по манифесту фичи](./feature-manifest.md)
- [Руководство по API](../processes/api-guidelines.md)