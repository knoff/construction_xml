import * as React from "react";
import { api } from "@/lib/api";
import { buildMappingKey, type Path } from "@/features/forms/utils/path";
import { useDocumentMeta } from "@/pages/DocumentFill";
import type { ValueTypeCompatibility } from "@/features/forms/valueMapping/store";

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

export type ValueLinkMeta = {
  source?: {
    key: string;
    label?: string | null;
    path?: string | null;
    valueType?: string | null;
  };
  target?: {
    key: string;
    label?: string | null;
    path?: string | null;
    valueType?: string | null;
  };
  compatibility?: ValueTypeCompatibility;
  confirmed_at?: string | number | null;
};

export type ValueLinkRecord = {
  id: number;
  left_key: string;
  right_key: string;
  relation: string;
  weight?: number | null;
  meta?: ValueLinkMeta | null;
};

export type ValueLinkController = {
  buildKey: (path: Path) => string | null;
  getStatus: (path: Path) => ValueLinkStatus | undefined;
  check: (path: Path, value: unknown) => Promise<ValueLinkStatus | undefined>;
  getLinks: (path: Path) => ValueLinkRecord[] | undefined;
  refreshLinks: (path: Path) => Promise<ValueLinkRecord[]>;
  link: (params: { sourceKey: string; targetKey: string; meta?: ValueLinkMeta | null }) => Promise<ValueLinkRecord>;
  unlink: (linkId: number) => Promise<void>;
};

const ValueLinkCtx = React.createContext<ValueLinkController | null>(null);

export function ValueLinkProvider({ children }: { children: React.ReactNode }) {
  const meta = useDocumentMeta();
  const [map, setMap] = React.useState<Record<string, ValueLinkStatus>>({});
  const [links, setLinks] = React.useState<Record<string, ValueLinkRecord[]>>({});

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

  const link = React.useCallback(
    async ({ sourceKey, targetKey, meta }: { sourceKey: string; targetKey: string; meta?: ValueLinkMeta | null }) => {
      const [leftKey, rightKey] = sourceKey <= targetKey ? [sourceKey, targetKey] : [targetKey, sourceKey];
      const response = await api.post<ValueLinkRecord>("/value-links", {
        left_key: leftKey,
        right_key: rightKey,
        relation: "eq",
        meta,
      });
      const record = response.data;
      setLinks((prev) => {
        const next = { ...prev };
        next[leftKey] = [...(prev[leftKey] ?? []).filter((item) => item.id !== record.id), record];
        next[rightKey] = [...(prev[rightKey] ?? []).filter((item) => item.id !== record.id), record];
        return next;
      });
      return record;
    },
    [],
  );

  const unlink = React.useCallback(async (linkId: number) => {
    await api.delete(`/value-links/${linkId}`);
    setLinks((prev) => {
      const next: typeof prev = {};
      for (const key of Object.keys(prev)) {
        next[key] = prev[key].filter((item) => item.id !== linkId);
      }
      return next;
    });
  }, []);

  const getLinks = React.useCallback(
    (path: Path) => {
      const key = buildKey(path);
      return key ? links[key] : undefined;
    },
    [buildKey, links],
  );

  const refreshLinks = React.useCallback(
    async (path: Path) => {
      const key = buildKey(path);
      if (!key) return [];
      try {
        const response = await api.get<{ items: ValueLinkRecord[] }>("/value-links", { params: { key } });
        const items = response.data.items ?? [];
        setLinks((prev) => ({ ...prev, [key]: items }));
        return items;
      } catch (error) {
        console.error("Failed to list value links", error);
        setLinks((prev) => ({ ...prev, [key]: [] }));
        return [];
      }
    },
    [buildKey],
  );

  const value = React.useMemo<ValueLinkController>(
    () => ({ buildKey, getStatus, check, getLinks, refreshLinks, link, unlink }),
    [buildKey, getStatus, check, getLinks, refreshLinks, link, unlink],
  );

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
