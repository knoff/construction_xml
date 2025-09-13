import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ExtensionBinding, ExtensionScope } from "./types";
import { fetchExtensionsMapping, upsertExtensionBinding } from "./api";

type Ctx = {
  ready: boolean;
  error: string | null;
  getBinding: (path: string, scope: ExtensionScope) => ExtensionBinding | undefined;
  setBinding: (b: ExtensionBinding) => Promise<void>;
};

const EmptyCtx: Ctx = {
  ready: true, error: null,
  getBinding: () => undefined,
  setBinding: async () => {},
};

const ExtensionsMapCtx = createContext<Ctx>(EmptyCtx);

export function ExtensionsMappingProvider({ schemaId, children }:{ schemaId: number; children: React.ReactNode }) {
  const [map, setMap] = useState<Map<string, ExtensionBinding>>(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setReady(false); setError(null);
    fetchExtensionsMapping(schemaId)
      .then((data) => {
        if (!alive) return;
        const m = new Map<string, ExtensionBinding>();
        for (const b of (data?.bindings ?? [])) {
          m.set(`${b.scope}|${b.path}`, b);
        }
        setMap(m); setReady(true);
        console.info("[extensions] loaded", { schemaId, count: m.size, sample: Array.from(m.keys()).slice(0,8) });
      })
      .catch((e) => { if (alive) { setError(String(e)); setReady(true); }});
    return () => { alive = false; };
  }, [schemaId]);

  const getBinding = (path: string, scope: ExtensionScope) => map.get(`${scope}|${path}`);
  const setBinding = async (b: ExtensionBinding) => {
    await upsertExtensionBinding(schemaId, b);
    setMap(prev => {
      const next = new Map(prev);
      next.set(`${b.scope}|${b.path}`, b);
      return next;
    });
    console.info("[extensions] upsert", b);
  };

  const value = useMemo(() => ({ ready, error, getBinding, setBinding }), [ready, error, map, schemaId]);
  return <ExtensionsMapCtx.Provider value={value}>{children}</ExtensionsMapCtx.Provider>;
}

export function useExtensionsMapping() {
  return useContext(ExtensionsMapCtx);
}
