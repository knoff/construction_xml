import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchFileBindings } from "./api";
import type { FileBinding } from "./types";
import { pathKeyCandidates } from "./path";

type Ctx = {
  hasBinding: (path: string) => boolean;
  isContainer: (path: string) => boolean;
  getBinding: (path: string) => { binding?: FileBinding; matchedKey?: string } ;
  ready: boolean;
  error: string | null;
  _dbg?: { size: number; schemaId: number };
};
// safe default: не падаем, просто ничего не подсвечиваем
export const __defaultCtx: Ctx = {
  hasBinding: () => false,
  isContainer: () => false,
  getBinding: () => ({ }),
  ready: true,
  error: null,
};
const FileBindingsCtx = createContext<Ctx>(__defaultCtx);

export function FileBindingsProvider({ schemaId, children }:{ schemaId:number; children:React.ReactNode }) {
  const [map, setMap] = useState<Map<string, FileBinding>>(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    setReady(false); setError(null);
    fetchFileBindings(schemaId)
      .then((data) => {
        if (!alive) return;
        const m = new Map<string, FileBinding>();
        for (const b of (data?.bindings ?? [])) {
          // нормализуем ключ бэка: убираем лишние слеши/хвост
          let k = (b.rootPath ?? "").toString();
          k = k.replace(/\/{2,}/g, "/").replace(/\/$/, "");
          m.set(k, b);
          // также храним ключ без ведущего слеша (на случай несовпадений)
          if (k.startsWith("/")) m.set(k.slice(1), b);
        }
        setMap(m); setReady(true);
        try {
          console.info("[file-bindings] loaded", {
            schemaId,
            count: m.size,
            sample: Array.from(m.keys()).slice(0, 8),
          });
        } catch {}
      })
      .catch((e) => { if (alive) { setError(String(e)); setReady(true); }});
    return () => { alive = false; };
  }, [schemaId]);
  const hasBinding = (path: string) => {
    const candidates = pathKeyCandidates(path);
    for (const c of candidates) if (map.has(c)) return true;
    return false;
  };
  const isContainer = (path: string) => {
    const candidates = pathKeyCandidates(path);
    for (const c of candidates) {
      const b = map.get(c);
      if (b) return b.kind === "container";
    }
    return false;
  };

  const getBinding = (path: string) => {
    const candidates = pathKeyCandidates(path);
    for (const c of candidates) {
      const b = map.get(c);
      if (b) return { binding: b, matchedKey: c };
    }
    return {};
  };

  const value = useMemo(() => ({
    hasBinding,
    isContainer,
    getBinding,
    ready,
    error,
    _dbg: { size: map.size, schemaId },
  }), [map, ready, error, schemaId]);
  return <FileBindingsCtx.Provider value={value}>{children}</FileBindingsCtx.Provider>;
}

export function useFileBindings() {
  const ctx = useContext(FileBindingsCtx);
  return ctx;
}

// Опционально: предупредим в дев-сборке, если провайдера нет (единоразово)
export function useFileBindingsDevWarnOnce(component: string) {
  const ctx = useFileBindings();
  const warnedRef = useRef(false);
  useEffect(() => {
    // предупреждаем всегда (нам нужно в production тоже)
    if (ctx === __defaultCtx && !warnedRef.current) {
      console.warn(`[file-bindings] ${component} отрисован без FileBindingsProvider — подсветка не активна`);
      warnedRef.current = true;
    }
  }, [ctx, component]);
  return ctx;
}