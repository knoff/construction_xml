# Механизм манифестов фич и расширений

> Документ описывает инфраструктуру автоподхвата фич, их публичных API и точек расширения. Механизм служит основой для построения маршрутов, фасадов и управляемого взаимодействия между фичами и подфичами.

## 1. Общая идея

1. **Каждая фича** описывает себя через манифест (`FeatureManifest`) в своём `index.ts`.
2. **Ядро приложения** автоматически собирает манифесты (`import.meta.glob`) и формирует реестр фич, публичных экспортов и маршрутов.
3. **Подфичи** (модули) используют тот же контракт: родительский `index.ts` агрегирует их через `modules`.
4. **Расширения** оформляются через объявленные точек расширения. По умолчанию всё закрыто; доступ появляется только при явном разрешении.

Таким образом, базовая инфраструктура (вне `features/`) не меняется при добавлении или переработке фич: достаточно корректно оформить манифест.

## 2. Интерфейсы манифеста

```ts
export interface FeatureRoute {
  path?: string;
  index?: boolean;
  component: () => Promise<{ default: React.ComponentType<any> }>;
  children?: FeatureRoute[];
}

export interface FeatureExportsGroup {
  pages?: Record<string, React.ComponentType<any>>;
  components?: Record<string, React.ComponentType<any>>;
  runtime?: Record<string, unknown>;
  adapters?: Record<string, unknown>;
  utils?: Record<string, unknown>;
}

export interface FeatureExports {
  public?: FeatureExportsGroup;
  internal?: FeatureExportsGroup;
}

export interface FeatureExtensionContextParams {
  target: FeatureManifest;
  source: FeatureManifest;
  point: FeatureExtensionPoint;
  targetExports: FeatureRuntimeExports;
  sourceExports: FeatureRuntimeExports;
}

export interface FeatureExtensionContext extends FeatureExtensionContextParams {
  [key: string]: unknown;
}

export interface FeatureExtensionPoint {
  id: string;
  description?: string;
  allowedTargets?: string[]; // При отсутствии — по умолчанию только текущая фича
  createContext?: (params: FeatureExtensionContextParams) => FeatureExtensionContext;
  apply(context: FeatureExtensionContext, extension: FeatureExtension): void;
}

export interface FeatureExtension {
  target: string; // ID фичи, которую расширяем
  point: string;  // ID точки расширения
  apply(context: FeatureExtensionContext): void;
}

export interface FeatureManifest {
  id: string;                     // Уникальный идентификатор фичи
  title?: string;                 // Человеко-читаемое название (для навигации, аналитики)
  routes?: FeatureRoute[];        // Маршруты, которые фича регистрирует
  exports?: FeatureExports;       // Публичные и внутренние сущности
  extensionPoints?: FeatureExtensionPoint[];
  extensions?: FeatureExtension[];
  modules?: FeatureManifest[];
}

export interface FeatureRuntimeExports {
  public: FeatureExportsGroup;
  internal: FeatureExportsGroup;
}

export interface ResolvedFeature {
  manifest: FeatureManifest;
  exports: FeatureRuntimeExports;
  modules: ResolvedFeature[];
}

export function defineFeature(manifest: FeatureManifest): FeatureManifest;
export function createRuntimeExports(initial?: FeatureExports): FeatureRuntimeExports;
export function resolveFeature(manifest: FeatureManifest): ResolvedFeature;
export function flattenFeatures(features: FeatureManifest[]): FeatureManifest[];
export function flattenResolvedFeatures(features: ResolvedFeature[]): ResolvedFeature[];
```

### Особенности

- `public` — всё, что фича готова отдавать наружу (например, страницы, хуки). Ядро собирает их в глобальный фасад.
- `internal` — сущности, которые остаются внутри фичи или доступны только родителю (например, кнопка подфичи для родителя).
- `FeatureRuntimeExports` — итоговые сгруппированные экспорты (public/internal), которые используются как контекст при расширениях.
- `modules` — вложенные фичи. В родительском `index.ts` используется `import.meta.glob("./modules/*/index.ts", { eager: true })`, чтобы список собирался автоматически.
- `defineFeature` служит для проверки структуры и обеспечивает единообразный экспорт (`export const feature = defineFeature({...})`).
- `resolveFeature` и `flattenResolvedFeatures` используются ядром для подготовки дерева фич и прохождения по нему (например, при применении расширений или сборке фасада).

## 3. Автоподхват фич в ядре

### 3.1 Реестр фич (`lib/features/registry.ts`)

```ts
const featureEntries = import.meta.glob<{ feature: FeatureManifest }>(
  "@/features/*/index.ts",
  { eager: true },
);

export const features = Object.values(featureEntries).map((mod) => mod.feature);
```

- Каждая фича обязана экспортировать `feature`, описанный через `defineFeature`.
- Итоговый массив `features` используется для построения маршрутов, фасадов и анализа зависимостей.

### 3.2 Построение маршрутов

```ts
export function buildRoutes(features: FeatureManifest[]): RouteObject[] {
  return features.flatMap((feature) => buildRoutesFromManifest(feature));
}
```

`buildRoutesFromManifest` разворачивает `FeatureRoute` (учитывая `index`, вложенные пути, lazy-загрузку).

**Как работает текущее ядро маршрутов:**

1. `src/main.tsx` синхронно импортирует `routes` и сразу создаёт `createBrowserRouter`.
2. `app/router/routes.tsx` разворачивает дерево реестра в массив `RouteObject`, оборачивая каждую страницу в `React.lazy`.
3. Корневой маршрут всегда использует `RootLayout`, а если ни одна фича не объявила `index`, первый доступный пункт навигации добавляется как редирект (`Navigate`).
4. Это гарантирует, что базовая разметка (`header` + `main` внутри `RootLayout`) рендерится ещё до загрузки ленивых страниц.

> **Важно:** любые изменения в механизме должны сохранять синхронность импорта `routes`, иначе приложение не смонтируется до завершения асинхронного bootstrap.

### 3.3 Навигация

- `app/navigation.ts` хранит основной список ссылок в `Map` + подписчиков.
- `usePrimaryNavigationLinks` использует `useSyncExternalStore`, поэтому любое изменение реестра моментально перерисовывает `RootLayout`.
- Для синхронного появления пункта в меню возможны два пути:
  1. описать расширение на точку `app:navigation.primary` (см. `features/docs/index.ts`), которое выполнится сразу после загрузки манифеста;
  2. подключить небольшой `bootstrap`-модуль, который регистрирует ссылку напрямую (как временное решение, пока фича ещё не мигрирована полностью).

Фича появляется в меню **только если** она сама регистрирует ссылку. Ядро не синтезирует навигацию автоматически.

### 3.4 Формирование фасада

```ts
export interface FeatureFacade {
  pages: Record<string, React.ComponentType<any>>;
  runtime: Record<string, unknown>;
  adapters: Record<string, unknown>;
}

export function collectFacade(features: FeatureManifest[]): FeatureFacade {
  const result: FeatureFacade = { pages: {}, runtime: {}, adapters: {} };

  for (const feature of features) {
    mergeExports(result, feature);
  }

  return result;
}
```

`mergeExports` записывает `public`-сущности в фасад, одновременно обрабатывая `modules`. Для `internal` объектов родитель решает сам (например, подмешивая их в свои `public`).

## 4. Расширения

### 4.1 Точки расширения (extension points)

- Объявляются в фиче, которая готова принимать расширения.
- `allowedTargets` определяет список фич (по `FeatureManifest.id`), которые имеют право подключаться. По умолчанию — только сама фича.
- `apply` содержит логику применения расширения: регистрация компонента, патчирование обработчика и т.д.

Пример:

```ts
extensionPoints: [
  {
    id: "documents.toolbar",
    description: "Кнопки тулбара на странице документов",
    allowedTargets: ["documents", "documents.modules.forms"],
    apply(context, extension) {
      extension.apply(context);
    },
  },
];
```

### 4.2 Расширения (extensions)

- Подфича или соседняя фича заполняет `extensions`, указывая целевую фичу (`target`) и точку (`point`).
- Внутри `apply` подфича получает `FeatureExtensionContext`, который предоставляет только разрешённые операции (например, `registerButton`).
- Если точка не объявлена или фича не входит в `allowedTargets`, расширение игнорируется (и желательно логируется).

Пример подфичи:

```ts
extensions: [
  {
    target: "documents",
    point: "documents.toolbar",
    apply(context) {
      context.registerButton({ id: "print", component: PrintButton });
    },
  },
];
```

### 4.3 Конвейер применения расширений

1. Собираем все фичи (`features`).
2. Формируем словарь `extensionPoints` по фичам (учитывая `modules`).
3. Для каждой фичи проходим её `extensions` и ищем целевую точку.
4. Если цель найдена и текущая фича разрешена, вызываем `extensionPoint.apply(context, extension)`.
5. Контекст формируется фичей-владельцем точки (родитель может передать собственные сервисы, например, реестр команд).

Таким образом, расширяемость полностью контролируется владельцем точки — он решает, что разрешено и в каком формате.

### 4.4 Требования к фиче, чтобы попасть в маршруты и навигацию

1. `features/<id>/index.ts` обязан экспортировать `feature = defineFeature({...})`.
2. В манифесте нужно указать хотя бы один маршрут:
   ```ts
   routes: [
     {
       path: "docs",
       component: () => import("./components/pages/DocsPage"),
     },
   ];
   ```
   Маршрут может быть `index: true` или иметь `children`; главное — лениво возвращать компонент страницы.
3. Чтобы ссылка появилась в UI, фича должна либо:
   - добавить расширение в точку `app:navigation.primary` и вызвать `context.registerLink`, либо
   - импортировать отдельный bootstrap-файл, который вызовет `registerPrimaryNavigationLink` напрямую (до миграции на расширения).
4. `.blocked`-файл в корне `features/<id>` временно отключает фичу из реестра и маршрутов (используется, пока идёт миграция).

Такой контракт позволяет ядру автоматически собирать маршруты и меню без ручного редактирования `routes.tsx` при добавлении новой фичи.

## 5. Роли и ответственность

| Участок | Ответственность |
| --- | --- |
| Фича (index.ts) | Описывает манифест, экспортирует `feature` через `defineFeature`. Указывает публичные/внутренние сущности, маршруты, точки расширения и расширения. |
| Подфича | Точно так же описывает себя. Родитель автоматически подключает через `modules`. |
| Ядро (`lib/features/*`, `app/router/*`) | Собирает манифесты, строит маршруты, формирует фасады. Базовая логика неизменна при добавлении новой фичи. |
| Документация | При добавлении/изменении точек расширения и экспортов обновляется `feature-manifest.md` и документация конкретной фичи. |

## 6. Рекомендации по внедрению

1. **Создать инфраструктуру** в `lib/features` (типы, `defineFeature`, сборщики маршрутов и фасадов).
2. **Перевести одну фичу (например, `documents`)** на новый контракт, проверить подхват маршрутов и экспортов.
3. **Обновить `app/router/routes.tsx`** и связанный код на использование реестра.
4. **Последовательно переносить чередующиеся фичи**, доводя их `index.ts` до нового формата.
5. **Документировать точки расширения** в описании фич, чтобы разработчики знали, какие расширения доступны и кто может их использовать.

## 7. Ограничения и контроль

- Если фича не экспортирует `feature`, она не попадёт в реестр.
- Любая точка расширения закрыта по умолчанию: пока разработчик явно не добавил идентификатор фичи в `allowedTargets`, внешние расширения заблокированы.
- Подфичи не экспортируют `public` автоматически — родитель решает, что пробрасывать наружу через собственный фасад.
- Рутинные операции (например, сбор extensionPoints и применение extensions) стоит покрыть тестами, чтобы гарантировать корректный конвейер.

## 8. Связанные документы

- [Общий обзор фронтенд-архитектуры](./frontend.md)
- [Структура фич и подфич](./features.md)
- [Текущая карта фронтенда](./current-map.md)
- [Руководство по ревью](./review-guide.md)
