// Centralized path helpers (dot-separated paths to match Renderer.tsx)
export type Path = (string | number)[];

/** Join path segments into "a.b.0.c" */
export function pathKey(path: Path): string {
  return path.map((k) => String(k)).join(".");
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

/** Safe read by path */
export function getAtPath(obj: any, path: Path): any {
  return path.reduce((acc, key) => (acc == null ? acc : acc[key as any]), obj);
}
