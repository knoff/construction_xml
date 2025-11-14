import * as React from "react";
import { api } from "@/lib/api";
import { buildMappingKey, type Path } from "@/features/forms/utils/path";
import { useDocumentMeta } from "@/pages/DocumentFill";

export type ValueLinkMatch = {
  key: string;
  value: unknown;
  source_type: "document" | "entity";
  document?: {
    uid?: string | null;
    object_id?: number | null;
    schema_code?: string | null;
    schema_version?: string | null;
    title?: string | null;
    version?: {
      id?: number | null;
      created_at?: string | null;
    };
  };
  entity?: {
    type?: string | null;
    id?: number | null;
    uid?: string | null;
    name?: string | null;
  };
};

export type ValueLinkStatus = {
  state: "idle" | "loading" | "matched" | "mismatch" | "empty" | "error";
  matches: ValueLinkMatch[];
  error?: string;
};

type ValueLinkController = {
  buildKey: (path: Path) => string | null;
  getStatus: (path: Path) => ValueLinkStatus | undefined;
  check: (path: Path, value: unknown) => Promise<ValueLinkStatus | undefined>;
};

const ValueLinkCtx = React.createContext<ValueLinkController | null>(null);

export function ValueLinkProvider({ children }: { children: React.ReactNode }) {
  const meta = useDocumentMeta();
  const [map, setMap] = React.useState<Record<string, ValueLinkStatus>>({});

  const buildKey = React.useCallback(
    (path: Path) => buildMappingKey(meta.schemaCode ?? null, meta.schemaVersion ?? null, path),
    [meta.schemaCode, meta.schemaVersion],
  );

  const getStatus = React.useCallback(
    (path: Path) => {
      const key = buildKey(path);
      return key ? map[key] : undefined;
    },
    [buildKey, map],
  );

  const check = React.useCallback(
    async (path: Path, value: unknown) => {
      const key = buildKey(path);
      if (!key) return undefined;
      setMap((prev) => ({ ...prev, [key]: { state: "loading", matches: [] } }));
      try {
        const context = {
          object_uid: meta.objectUid ?? undefined,
          document_uid: meta.documentUid ?? undefined,
        };
        const resp = await api.post("/value-links/check", { key, value, context });
        const status: ValueLinkStatus = {
          state: resp.data.status,
          matches: resp.data.matches ?? [],
        };
        setMap((prev) => ({ ...prev, [key]: status }));
        return status;
      } catch (error: any) {
        const message = error?.response?.data?.detail ?? error?.message ?? "Ошибка запроса";
        const status: ValueLinkStatus = { state: "error", matches: [], error: message };
        setMap((prev) => ({ ...prev, [key]: status }));
        return status;
      }
    },
    [buildKey, meta.documentUid, meta.objectUid],
  );

  const value = React.useMemo<ValueLinkController>(() => ({ buildKey, getStatus, check }), [buildKey, getStatus, check]);

  return <ValueLinkCtx.Provider value={value}>{children}</ValueLinkCtx.Provider>;
}

export function useValueLinks(): ValueLinkController {
  const ctx = React.useContext(ValueLinkCtx);
  if (!ctx) throw new Error("useValueLinks must be used within ValueLinkProvider");
  return ctx;
}

export function useValueLinkStatus(path: Path) {
  const { getStatus } = useValueLinks();
  return getStatus(path);
}
