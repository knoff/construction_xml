import * as React from "react";

export type UiOverrides = {
  labels?: Record<string, string>;
  widgets?: Record<string, string>;
  [key: string]: unknown;
};

export type UiOverridesContextValue = {
  overrides: UiOverrides;
  setOverrides: (next: UiOverrides) => void;
  markDirty: () => void;
};

const UiOverridesCtx = React.createContext<UiOverridesContextValue | null>(null);

export function UiOverridesProvider({ value, children }: { value: UiOverridesContextValue; children: React.ReactNode }) {
  return <UiOverridesCtx.Provider value={value}>{children}</UiOverridesCtx.Provider>;
}

export function useUiOverrides() {
  const ctx = React.useContext(UiOverridesCtx);
  if (!ctx) {
    throw new Error("useUiOverrides must be used within UiOverridesProvider");
  }
  return ctx;
}

export type DocumentMeta = {
  documentId: number;
  documentUid?: string | null;
  objectId?: number | null;
  objectUid?: string | null;
  objectName?: string | null;
  schemaId?: number | null;
  schemaCode?: string | null;
  schemaName?: string | null;
  schemaVersion?: string | null;
};

const DocumentMetaCtx = React.createContext<DocumentMeta | null>(null);

export function DocumentMetaProvider({ value, children }: { value: DocumentMeta; children: React.ReactNode }) {
  return <DocumentMetaCtx.Provider value={value}>{children}</DocumentMetaCtx.Provider>;
}

export function useDocumentMeta() {
  const ctx = React.useContext(DocumentMetaCtx);
  if (!ctx) {
    throw new Error("useDocumentMeta must be used within DocumentMetaProvider");
  }
  return ctx;
}
