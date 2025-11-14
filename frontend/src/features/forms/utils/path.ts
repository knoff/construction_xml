// Centralized path helpers (dot-separated paths to match Renderer.tsx)
export type Path = (string | number)[];

/** Join path segments into "a.b.0.c" */
export function pathKey(path: Path): string {
  return path.map((k) => String(k)).join(".");
}

export function buildMappingKey(
  schemaCode: string | null | undefined,
  schemaVersion: string | null | undefined,
  path: Path,
): string | null {
  if (!schemaCode || !schemaVersion) return null;
  const safeVersion = schemaVersion.replace(/\./g, "~");
  const key = pathKey(path);
  return key ? `${schemaCode}#${safeVersion}.${key}` : `${schemaCode}#${safeVersion}`;
}

/** Split key "a.b.*.c" -> ["a","b","*","c"] */
export function splitKey(key: string): string[] {
  return key ? key.split(".") : [];
}

/** Normalize with wildcard for numeric indices: "A.0.B.12.C" -> "A.*.B.*.C" */
export function normalizePathKey(pk: string): string {
  return pk
    .split(".")
    .map((seg) => (/^\d+$/.test(seg) ? "*" : seg))
    .join(".");
}

/** Legacy normalizer used across the file */
export function normalizeKey(key: string): string {
  return key.split(".").map(seg => (/^\d+$/.test(seg) ? "*" : seg)).join(".");
}


export function setAtPath<T = any>(obj: T, path: Path, value: any): T {
  if (path.length === 0) return value;
  const root = cloneShallow(obj);
  let cur: any = root;

  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    const nextK = path[i + 1];
    const nextIsIndex = typeof nextK === "number";
    const curVal = cur[k as any];

    if (curVal == null) {
      cur[k as any] = nextIsIndex ? [] : {};
    } else if (!isPlainObject(curVal) && !Array.isArray(curVal)) {
      // если по пути лежит скаляр — разворачиваем соответствующий контейнер
      cur[k as any] = nextIsIndex ? [] : {};
    } else {
      // клон узла по пути
      cur[k as any] = cloneShallow(curVal);
    }
    cur = cur[k as any];
  }
  const last = path[path.length - 1];
  if (Array.isArray(cur) && typeof last === "number") {
    const arr = cur as any[];
    const idx = last;
    if (idx === arr.length) arr.push(value);
    else arr[idx] = value;
  } else {
    cur[last as any] = value;
  }
  return root;
}

export function delAtPath<T = any>(obj: T, path: Path): T {
  if (path.length === 0) return obj;
  const root = cloneShallow(obj);
  let cur: any = root;

  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    const next = cur[k as any];
    if (next == null) return root; // нет узла — нечего удалять
    cur[k as any] = cloneShallow(next);
    cur = cur[k as any];
  }

  const last = path[path.length - 1];
  if (Array.isArray(cur) && typeof last === "number") {
    const arr = cur as any[];
    if (last >= 0 && last < arr.length) arr.splice(last, 1);
  } else {
    delete cur[last as any];
  }
  return root;
}

export function updateAtPath<T = any>(obj: T, path: Path, updater: (prev: any) => any): T {
  const prev = getAtPath(obj, path);
  return setAtPath(obj, path, updater(prev));
}

export function hasAtPath(obj: any, path: Path): boolean {
  let cur = obj;
  for (const k of path) {
    if (cur == null) return false;
    cur = cur[k as any];
  }
  return true;
}

/** Вспомогательная группа для массивов */
export function pushAtPath<T = any>(obj: T, path: Path, value: any): T {
  return updateAtPath(obj, path, (arr: any) => {
    const next = Array.isArray(arr) ? [...arr, value] : [value];
    return next;
  });
}

export function insertAtPath<T = any>(obj: T, path: Path, index: number, value: any): T {
  return updateAtPath(obj, path, (arr: any) => {
    const next = Array.isArray(arr) ? [...arr] : [];
    next.splice(index, 0, value);
    return next;
  });
}

export function removeAtPath<T = any>(obj: T, path: Path, index: number): T {
  return updateAtPath(obj, path, (arr: any) => {
    const next = Array.isArray(arr) ? [...arr] : [];
    next.splice(index, 1);
    return next;
  });
}

export function moveAtPath<T = any>(obj: T, path: Path, from: number, to: number): T {
  return updateAtPath(obj, path, (arr: any) => {
    const next = Array.isArray(arr) ? [...arr] : [];
    if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    return next;
  });
}

/** Safe read by path */
export function getAtPath(obj: any, path: Path): any {
  return path.reduce((acc, key) => (acc == null ? acc : acc[key as any]), obj);
}


// разделение и фильтрация "смешанного" контейнера __choice__ 
export function splitChoiceContainer(v: any) {
  if (Array.isArray(v)) return { arr: v as any[], obj: {} as Record<string, any> };
  if (v && typeof v === "object") {
    const arr: any[] = [];
    const obj: Record<string, any> = {};
    for (const k of Object.keys(v)) {
      if (/^\d+$/.test(k)) arr[Number(k)] = v[k];
      else obj[k] = v[k];
    }
    return { arr, obj };
  }
  return { arr: [] as any[], obj: {} as Record<string, any> };
}

// Возвращает только те элементы, чьи верхние ключи принадлежат текущей группе options.
export function filterChoiceGroup(items: any[], options: { name: string }[]) {
  const allowed = new Set(options.map(o => o.name));
  return items.filter(item => {
    if (!item || typeof item !== "object") return false;
    const keys = Object.keys(item);
    // элемент choice-элемента всегда с одним верхним ключом
    const k = keys[0];
    return allowed.has(k);
  });
}


/** helpers */
function cloneShallow<T>(v: T): T {
  if (Array.isArray(v)) return [...v] as any;
  if (isPlainObject(v)) return { ...(v as any) };
  // примитивы/даты/прочее — возвращаем как есть
  return v;
}
function isPlainObject(v: any): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === "[object Object]";
}