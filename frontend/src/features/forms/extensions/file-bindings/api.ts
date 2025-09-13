declare global {
  interface Window { FILE_BINDINGS_DEBUG?: boolean }
}

function fbDebugEnabled() {
  try {
    if (typeof window !== "undefined") {
      if (window.FILE_BINDINGS_DEBUG) return true;
      const qs = new URLSearchParams(window.location.search);
      return qs.has("fbdbg");
    }
  } catch {}
  return false;
}

export async function fetchFileBindings(schemaId: number) {
  const url = `/api/schemas/${schemaId}/file-bindings`;
  console.info("[file-bindings] fetch", url);
  const r = await fetch(url, {
    method: "GET",
    cache: "no-store",       // чтобы точно появился Network-запрос
    headers: { "Accept": "application/json" },
  });
  console.info("[file-bindings] status", r.status);
  if (!r.ok) throw new Error(await r.text());
  // ожидаем структуру типа: { bindings: Array<{ path: string, kind: "file"|"container", meta?: any }> }
  return r.json();
}
