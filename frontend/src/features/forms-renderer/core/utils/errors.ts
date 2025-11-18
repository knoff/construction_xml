import { pathKey, normalizeKey, splitKey } from "./path";

export type ErrorsMap = Record<string, string[]>;

export function hasRequiredWord(msg: string) {
  return /обязат/i.test(msg); // «обязат...» всех форм
}

/** Вернуть список сообщений ошибок ровно для "узла" (не поддерева), с несколькими стратегиями сопоставления */
export function getLocalErrorsForPath(errors: ErrorsMap | undefined, path: (string|number)[]): string[] {
  if (!errors) return [];
  const exact = pathKey(path);
  const exactArr = errors[exact] ?? [];
  if (exactArr.length) return exactArr;
  const norm = normalizeKey(exact);
  const normArr = errors[norm] ?? [];
  if (normArr.length) return normArr;
  if (path.length >= 2) {
    const noChoice = [...path.slice(0, -2), path[path.length - 1]];
    const noChoiceKey = pathKey(noChoice);
    const nc = errors[noChoiceKey] ?? errors[normalizeKey(noChoiceKey)] ?? [];
    if (nc.length) return nc;
  }
  return [];
}

/** Совпадение пути ключа ошибок с целевым путем, допуская пропуск ровно одного сегмента (для choice) */
function matchesWithOneSkip(errKey: string, targetKey: string): boolean {
  const a = splitKey(errKey);
  const b = splitKey(targetKey);
  let i = 0, j = 0, skips = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (skips < 1) { skips++; i++; continue; }
    return false;
  }
  // allow remaining tail only if we've consumed target
  return j === b.length;
}

/** Подсчёт всех ошибок поддерева блока, допуская пропуск одного сегмента под блоком (choice) */
export function countSubtreeErrors(errors: ErrorsMap | undefined, baseKey: string) {
  if (!errors) return { count: 0, preview: [] as string[] };
  const preview: string[] = [];
  let count = 0;
  const baseNorm = normalizeKey(baseKey);
  for (const [k, arr] of Object.entries(errors)) {
    if (!arr || arr.length === 0) continue;
    if (k === baseKey || k.startsWith(baseKey + ".")) {
      count += arr.length;
      for (const m of arr) if (preview.length < 3) preview.push(m);
      continue;
    }
    const kn = normalizeKey(k);
    if (kn === baseNorm || kn.startsWith(baseNorm + ".")) {
      count += arr.length;
      for (const m of arr) if (preview.length < 3) preview.push(m);
      continue;
    }
    if (matchesWithOneSkip(k, baseKey)) {
      count += arr.length;
      for (const m of arr) if (preview.length < 3) preview.push(m);
      continue;
    }
  }
  return { count, preview };
}

/** Есть ли у конкретного пути локальные ошибки валидатора (мягкий матч) */
export function hasAnyValidatorErrors(errors: ErrorsMap | undefined, path: (string|number)[]) {
  return getLocalErrorsForPath(errors, path).length > 0;
}
