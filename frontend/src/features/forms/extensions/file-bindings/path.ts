/**
 * Преобразует клиентский pathKey (обычно "a.b.0.c") в набор возможных
 * вариантов ключей, соответствующих формату rootPath с бэка (обычно "/a/b/c").
 * Мы не знаем точно, как обозначаются массивы на бэке, поэтому даём несколько гипотез.
 */
export function pathKeyCandidates(dotKey: string): string[] {
  const out = new Set<string>();
  if (!dotKey) return [];

  // 1) как есть (вдруг бэк тоже вернул с точками)
  out.add(dotKey);

  // 2) простой перевод "." -> "/"
  const slashBasic = dotKey.replace(/\./g, "/");
  out.add(slashBasic);
  out.add("/" + slashBasic); // с ведущим слешем

  // 3) обработка индексов массивов: ".0." -> "/0/"
  // (если бэк хранит индексы как сегменты пути)
  const dotIdx = dotKey.replace(/\.(\d+)(?=\.|$)/g, "/$1");
  out.add(dotIdx);
  out.add("/" + dotIdx);

  // 4) уплотнение слешей + удаление двойных/хвостовых
  for (const s of Array.from(out)) {
    let t = s.replace(/\/{2,}/g, "/");
    t = t.replace(/\/$/, "");
    out.add(t);
  }

  // 5) без ведущего слеша и с ведущим — обе версии
  for (const s of Array.from(out)) {
    if (!s.startsWith("/")) out.add("/" + s);
    if (s.startsWith("/")) out.add(s.slice(1));
  }

  return Array.from(out);
}
