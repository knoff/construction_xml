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

