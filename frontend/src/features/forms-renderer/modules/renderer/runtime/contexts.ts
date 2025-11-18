import * as React from "react";

type CollapseCtxValue = {
  get: (key: string) => boolean | undefined;
  set: (key: string, value: boolean) => void;
};

export const CollapseCtx = React.createContext<CollapseCtxValue>({
  get: () => undefined,
  set: () => undefined,
});

export function useCollapse() {
  return React.useContext(CollapseCtx);
}

type LabelOverride = { path: string; original: string; value?: string };

type LabelOverridesCtxValue = {
  items: LabelOverride[];
  getLabel: (pathKey: string) => string | undefined;
  hasOverride: (pathKey: string) => boolean;
  editLabel: (override: LabelOverride) => void;
  removeLabel: (pathKey: string) => void;
  openEditor: (args: { pathKey: string; original: string; current?: string }) => void;
};

export const LabelOverridesCtx = React.createContext<LabelOverridesCtxValue>({
  items: [],
  getLabel: () => undefined,
  hasOverride: () => false,
  editLabel: () => undefined,
  removeLabel: () => undefined,
  openEditor: () => undefined,
});

export function useLabelOverrides() {
  return React.useContext(LabelOverridesCtx);
}

// Form state controller context for block overrides to read/write form values
type FormStateCtxValue<T = any> = {
  state: T;
  setPath: (path: (string | number)[], value: unknown) => void;
  delPath: (path: (string | number)[]) => void;
};
export const FormStateCtx = React.createContext<FormStateCtxValue | null>(null);
export function useFormStateController<T = any>() {
  const ctx = React.useContext(FormStateCtx);
  if (!ctx) throw new Error("useFormStateController must be used within FormStateCtx.Provider");
  return ctx as FormStateCtxValue<T>;
}

