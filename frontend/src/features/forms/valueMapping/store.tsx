import * as React from "react";
import type { Path } from "@/features/forms/utils/path";
import {
  fetchDocumentFieldStructure,
  fetchEntityFieldStructure,
  fetchDocumentContexts,
  fetchEntityContexts,
  type DocumentFieldStructure,
  type EntityFieldStructure,
  type StructureParams,
  type FieldMeta,
  type DocumentFieldContext,
  type EntityFieldContext,
} from "./api";

const TYPE_ALIASES: Record<string, string> = {
  "xs:string": "string",
  "string": "string",
  "uuid": "string",
  "xs:normalizedstring": "string",
  "xs:token": "string",
  "xs:anyuri": "string",
  "xs:integer": "number",
  "integer": "number",
  "int": "number",
  "xs:int": "number",
  "xs:long": "number",
  "long": "number",
  "xs:short": "number",
  "short": "number",
  "xs:byte": "number",
  "byte": "number",
  "xs:decimal": "number",
  "decimal": "number",
  "xs:double": "number",
  "double": "number",
  "xs:float": "number",
  "float": "number",
  "number": "number",
  "xs:boolean": "boolean",
  "boolean": "boolean",
  "xs:date": "date",
  "date": "date",
  "xs:datetime": "datetime",
  "datetime": "datetime",
  "xs:time": "time",
  "time": "time",
  "xs:dateTime": "datetime",
  "xs:anytype": "any",
  "anytype": "any",
  "xs:anysimpletype": "any",
  "choice": "choice",
  "object": "object",
};

const NUMERIC_TYPES = new Set(["number"]);
const TEMPORAL_TYPES = new Set(["date", "datetime", "time"]);

export type ValueTypeCompatibility = {
  compatible: boolean;
  reason?: string;
  note?: string;
  sourceType?: string | null;
  targetType?: string | null;
  normalizedSource?: string | null;
  normalizedTarget?: string | null;
};

function normalizeValueType(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return TYPE_ALIASES[trimmed] ?? trimmed;
}

function isNumericType(value: string | null): boolean {
  if (!value) return false;
  return NUMERIC_TYPES.has(value);
}

function isTemporalType(value: string | null): boolean {
  if (!value) return false;
  return TEMPORAL_TYPES.has(value);
}

export function checkValueTypeCompatibility(
  sourceType?: string | null,
  targetType?: string | null,
): ValueTypeCompatibility {
  const normalizedSource = normalizeValueType(sourceType);
  const normalizedTarget = normalizeValueType(targetType);

  if (!normalizedSource && !normalizedTarget) {
    return {
      compatible: true,
      note: "Типы обоих полей не определены — сопоставление следует проверить вручную.",
      sourceType: sourceType ?? null,
      targetType: targetType ?? null,
      normalizedSource,
      normalizedTarget,
    };
  }

  if (!normalizedSource) {
    return {
      compatible: true,
      note: "Тип исходного поля не определён — проверьте сопоставление вручную.",
      sourceType: sourceType ?? null,
      targetType: targetType ?? null,
      normalizedSource,
      normalizedTarget,
    };
  }

  if (!normalizedTarget) {
    return {
      compatible: true,
      note: "Тип целевого поля не определён — проверьте сопоставление вручную.",
      sourceType: sourceType ?? null,
      targetType: targetType ?? null,
      normalizedSource,
      normalizedTarget,
    };
  }

  if (normalizedSource === normalizedTarget) {
    return {
      compatible: true,
      sourceType: sourceType ?? null,
      targetType: targetType ?? null,
      normalizedSource,
      normalizedTarget,
    };
  }

  if (isNumericType(normalizedSource) && isNumericType(normalizedTarget)) {
    return {
      compatible: true,
      note: "Оба поля относятся к числовым типам.",
      sourceType: sourceType ?? null,
      targetType: targetType ?? null,
      normalizedSource: "number",
      normalizedTarget: "number",
    };
  }

  if (isTemporalType(normalizedSource) && isTemporalType(normalizedTarget)) {
    return {
      compatible: true,
      note: "Оба поля относятся к временным типам.",
      sourceType: sourceType ?? null,
      targetType: targetType ?? null,
      normalizedSource,
      normalizedTarget,
    };
  }

  if (
    normalizedSource === "any"
    || normalizedTarget === "any"
    || normalizedSource === "object"
    || normalizedTarget === "object"
  ) {
    return {
      compatible: true,
      note: "Один из типов универсальный и допускает сопоставление.",
      sourceType: sourceType ?? null,
      targetType: targetType ?? null,
      normalizedSource,
      normalizedTarget,
    };
  }

  return {
    compatible: false,
    reason: `Тип целевого поля (${targetType ?? normalizedTarget}) не совместим с типом источника (${sourceType ?? normalizedSource}).`,
    sourceType: sourceType ?? null,
    targetType: targetType ?? null,
    normalizedSource,
    normalizedTarget,
  };
}

export type MappingDialogMode = "tree" | "search";
export type MappingDialogLoadingState = "idle" | "loading" | "error";
export type MappingDialogContextKind = "document" | "entity";

export type MappingDocumentContext = {
  documentId?: number | null;
  documentUid?: string | null;
  objectId?: number | null;
  objectUid?: string | null;
  objectName?: string | null;
  schemaId?: number | null;
  schemaCode?: string | null;
  schemaName?: string | null;
  schemaVersion?: string | null;
  description?: string | null;
};

export type MappingDocumentOption = DocumentFieldContext & { label: string };

export type MappingDialogTarget = {
  key: string;
  label: string;
  valueType?: string | null;
  path?: string | null;
};

export type MappingEntityContext = {
  entity: string;
  title: string;
  description?: string | null;
};

export type MappingEntityOption = EntityFieldContext & { label: string };

export type MappingConfirmation = {
  sourceKey: string;
  anchorValueType: string | null;
  target: MappingDialogTarget;
  targetContext: {
    kind: MappingDialogContextKind;
    id: number | string | null;
  };
  compatibility: ValueTypeCompatibility;
  confirmedAt: number;
};

export type MappingDialogState = {
  open: boolean;
  anchorPath: Path | null;
  anchorLabel: string | null;
  anchorValueType: string | null;
  sourceKey: string | null;
  contextKind: MappingDialogContextKind;
  contextId: number | string | null;
  filters: {
    query: string;
    valueTypes: string[];
  };
  mode: MappingDialogMode;
  loading: MappingDialogLoadingState;
  error: string | null;
  tree: FieldMeta[];
  matches: FieldMeta[];
  availableValueTypes: string[];
  selectedTarget: MappingDialogTarget | null;
  selectedTargetCompatibility: ValueTypeCompatibility | null;
  selectionError: string | null;
  confirmedMapping: MappingConfirmation | null;
  documentContext: MappingDocumentContext | null;
  entityContexts: MappingEntityContext[];
  documentOptions: MappingDocumentOption[];
  entityOptions: MappingEntityOption[];
  contextLoading: boolean;
};

export type OpenDialogPayload = {
  anchorPath: Path;
  anchorLabel?: string | null;
  anchorValueType?: string | null;
  sourceKey?: string | null;
};
const DEFAULT_ENTITY_CONTEXTS: MappingEntityContext[] = [
  {
    entity: "object",
    title: "Карточка объекта",
    description: "Сущность объекта капитального строительства",
  },
];

type InitialArg = {
  documentContext: MappingDocumentContext | null;
  entityContexts: MappingEntityContext[];
};

export type LoadStructureOptions = {
  kind?: MappingDialogContextKind;
  id?: number | string | null;
  query?: string;
  valueTypes?: string[];
};

const createInitialState = ({
  documentContext,
  entityContexts,
}: InitialArg): MappingDialogState => {
  const hasSchema = Boolean(documentContext?.schemaId);
  const fallbackEntity = entityContexts[0]?.entity ?? null;
  return {
    open: false,
    anchorPath: null,
    anchorLabel: null,
    anchorValueType: null,
    sourceKey: null,
    contextKind: hasSchema ? "document" : "entity",
    contextId: hasSchema ? documentContext?.schemaId ?? null : fallbackEntity,
    filters: {
      query: "",
      valueTypes: [],
    },
    mode: "tree",
    loading: "idle",
    error: null,
    tree: [],
    matches: [],
    availableValueTypes: [],
    selectedTarget: null,
    selectedTargetCompatibility: null,
    selectionError: null,
    confirmedMapping: null,
    documentContext,
    entityContexts,
    documentOptions: [],
    entityOptions: [],
    contextLoading: false,
  };
};

const enum ActionType {
  OPEN = "OPEN",
  CLOSE = "CLOSE",
  CLEAR_SELECTION = "CLEAR_SELECTION",
  SET_MODE = "SET_MODE",
  SET_FILTERS = "SET_FILTERS",
  SET_LOADING = "SET_LOADING",
  SET_DATA = "SET_DATA",
  SET_CONTEXT = "SET_CONTEXT",
  SET_SELECTED_TARGET = "SET_SELECTED_TARGET",
  SET_DOCUMENT_CONTEXT = "SET_DOCUMENT_CONTEXT",
  SET_ENTITY_CONTEXTS = "SET_ENTITY_CONTEXTS",
  SET_ERROR = "SET_ERROR",
  SET_CONTEXT_OPTIONS = "SET_CONTEXT_OPTIONS",
  SET_CONTEXT_LOADING = "SET_CONTEXT_LOADING",
  CONFIRM_SELECTION = "CONFIRM_SELECTION",
}

type Action =
  | { type: ActionType.OPEN; payload: OpenDialogPayload }
  | { type: ActionType.CLOSE }
  | { type: ActionType.CLEAR_SELECTION }
  | { type: ActionType.SET_MODE; payload: MappingDialogMode }
  | { type: ActionType.SET_FILTERS; payload: Partial<MappingDialogState["filters"]> }
  | { type: ActionType.SET_LOADING; payload: { loading: MappingDialogLoadingState; error?: string | null } }
  | { type: ActionType.SET_DATA; payload: Partial<Pick<MappingDialogState, "tree" | "matches" | "availableValueTypes">> }
  | { type: ActionType.SET_CONTEXT; payload: { kind: MappingDialogContextKind; id: number | string | null } }
  | {
      type: ActionType.SET_SELECTED_TARGET;
      payload: {
        target: MappingDialogTarget | null;
        compatibility: ValueTypeCompatibility | null;
        error?: string | null;
      };
    }
  | { type: ActionType.SET_DOCUMENT_CONTEXT; payload: MappingDocumentContext | null }
  | { type: ActionType.SET_ENTITY_CONTEXTS; payload: MappingEntityContext[] }
  | { type: ActionType.SET_ERROR; payload: string | null }
  | {
      type: ActionType.SET_CONTEXT_OPTIONS;
      payload: {
        documentOptions?: MappingDocumentOption[];
        entityOptions?: MappingEntityOption[];
      };
    }
  | { type: ActionType.SET_CONTEXT_LOADING; payload: boolean }
  | { type: ActionType.CONFIRM_SELECTION; payload: MappingConfirmation };

const reducer = (state: MappingDialogState, action: Action): MappingDialogState => {
  switch (action.type) {
    case ActionType.OPEN:
      return {
        ...state,
        open: true,
        anchorPath: action.payload.anchorPath,
        anchorLabel: action.payload.anchorLabel ?? null,
        anchorValueType: action.payload.anchorValueType ?? null,
        sourceKey: action.payload.sourceKey ?? null,
        filters: { query: "", valueTypes: [] },
        mode: "tree",
        loading: "idle",
        error: null,
        tree: [],
        matches: [],
        availableValueTypes: [],
        selectedTarget: null,
        selectedTargetCompatibility: null,
        selectionError: null,
        confirmedMapping: null,
      };
    case ActionType.CLOSE: {
      const base = createInitialState({
        documentContext: state.documentContext,
        entityContexts: state.entityContexts,
      });
      return {
        ...base,
        contextKind: state.contextKind,
        contextId: state.contextId,
      };
    }
    case ActionType.CLEAR_SELECTION:
      return {
        ...state,
        selectedTarget: null,
        selectedTargetCompatibility: null,
        selectionError: null,
      };
    case ActionType.SET_MODE:
      return { ...state, mode: action.payload };
    case ActionType.SET_FILTERS:
      return {
        ...state,
        filters: {
          query: action.payload.query ?? state.filters.query,
          valueTypes: action.payload.valueTypes ?? state.filters.valueTypes,
        },
      };
    case ActionType.SET_LOADING:
      return {
        ...state,
        loading: action.payload.loading,
        error: action.payload.error ?? null,
      };
    case ActionType.SET_DATA:
      return {
        ...state,
        tree: action.payload.tree ?? state.tree,
        matches: action.payload.matches ?? state.matches,
        availableValueTypes: action.payload.availableValueTypes ?? state.availableValueTypes,
      };
    case ActionType.SET_CONTEXT:
      return {
        ...state,
        contextKind: action.payload.kind,
        contextId: action.payload.id,
      };
    case ActionType.SET_SELECTED_TARGET:
      return {
        ...state,
        selectedTarget: action.payload.target,
        selectedTargetCompatibility: action.payload.compatibility,
        selectionError: action.payload.error ?? null,
      };
    case ActionType.SET_DOCUMENT_CONTEXT: {
      const base = createInitialState({ documentContext: action.payload, entityContexts: state.entityContexts });
      return {
        ...state,
        documentContext: action.payload,
        ...(state.open
          ? {}
          : {
              contextKind: base.contextKind,
              contextId: base.contextId,
            }),
      };
    }
    case ActionType.SET_ENTITY_CONTEXTS: {
      const base = createInitialState({ documentContext: state.documentContext, entityContexts: action.payload });
      return {
        ...state,
        entityContexts: action.payload,
        ...(state.open
          ? {}
          : {
              contextKind: base.contextKind,
              contextId: base.contextId,
            }),
      };
    }
    case ActionType.SET_ERROR:
      return { ...state, error: action.payload };
    case ActionType.SET_CONTEXT_OPTIONS:
      return {
        ...state,
        documentOptions: action.payload.documentOptions ?? state.documentOptions,
        entityOptions: action.payload.entityOptions ?? state.entityOptions,
      };
    case ActionType.SET_CONTEXT_LOADING:
      return { ...state, contextLoading: action.payload };
    case ActionType.CONFIRM_SELECTION:
      return {
        ...state,
        confirmedMapping: action.payload,
      };
    default:
      return state;
  }
};

export type MappingDialogActions = {
  openDialog: (payload: OpenDialogPayload) => void;
  closeDialog: () => void;
  clearSelection: () => void;
  setMode: (mode: MappingDialogMode) => void;
  setFilters: (filters: Partial<MappingDialogState["filters"]>) => void;
  setLoading: (loading: MappingDialogLoadingState, error?: string | null) => void;
  setContext: (kind: MappingDialogContextKind, id: number | string | null) => void;
  setData: (payload: Partial<Pick<MappingDialogState, "tree" | "matches" | "availableValueTypes">>) => void;
  setSelectedTarget: (
    payload: {
      target: MappingDialogTarget | null;
      compatibility?: ValueTypeCompatibility | null;
      error?: string | null;
    },
  ) => void;
  confirmSelection: (confirmation: MappingConfirmation) => void;
  loadStructure: (options?: LoadStructureOptions) => Promise<void>;
  loadContextOptions: () => Promise<void>;
};

type MappingDialogContextValue = {
  state: MappingDialogState;
  actions: MappingDialogActions;
};

const MappingDialogCtx = React.createContext<MappingDialogContextValue | null>(null);

export function MappingDialogProvider({
  children,
  documentContext = null,
  entityContexts = DEFAULT_ENTITY_CONTEXTS,
}: {
  children: React.ReactNode;
  documentContext?: MappingDocumentContext | null;
  entityContexts?: MappingEntityContext[];
}) {
  const [state, dispatch] = React.useReducer(reducer, undefined, () =>
    createInitialState({
      documentContext: documentContext ?? null,
      entityContexts: entityContexts ?? DEFAULT_ENTITY_CONTEXTS,
    }),
  );

  React.useEffect(() => {
    dispatch({ type: ActionType.SET_DOCUMENT_CONTEXT, payload: documentContext ?? null });
  }, [documentContext]);

  React.useEffect(() => {
    dispatch({ type: ActionType.SET_ENTITY_CONTEXTS, payload: entityContexts ?? DEFAULT_ENTITY_CONTEXTS });
  }, [entityContexts]);

  const activeRequestRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
        activeRequestRef.current = null;
      }
    };
  }, []);

  const loadStructure = React.useCallback<MappingDialogActions["loadStructure"]>(
    async (options) => {
      const kind = options?.kind ?? state.contextKind;
      const id = options?.id ?? state.contextId;
      const filters: StructureParams = {
        query: options?.query ?? state.filters.query,
        valueTypes: options?.valueTypes ?? state.filters.valueTypes,
      };

      if (!kind || !id) {
        dispatch({ type: ActionType.SET_ERROR, payload: "Контекст не выбран" });
        return;
      }

      const controller = new AbortController();
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
      activeRequestRef.current = controller;

      dispatch({ type: ActionType.SET_LOADING, payload: { loading: "loading", error: null } });

      try {
        let payload: DocumentFieldStructure | EntityFieldStructure | null = null;
        if (kind === "document") {
          if (typeof id !== "number") {
            throw new Error("schema_id_invalid");
          }
          payload = await fetchDocumentFieldStructure(id, filters, { signal: controller.signal });
          if (payload?.context) {
            dispatch({
              type: ActionType.SET_DOCUMENT_CONTEXT,
              payload: {
                documentId: state.documentContext?.documentId ?? null,
                documentUid: state.documentContext?.documentUid ?? null,
                objectId: state.documentContext?.objectId ?? null,
                objectUid: state.documentContext?.objectUid ?? null,
                objectName: state.documentContext?.objectName ?? null,
                schemaId: payload.context.schemaId,
                schemaCode: payload.context.schemaCode ?? null,
                schemaName: payload.context.schemaName,
                schemaVersion: payload.context.schemaVersion ?? null,
              },
            });
          }
        } else if (kind === "entity") {
          if (typeof id !== "string") {
            throw new Error("entity_invalid");
          }
          payload = await fetchEntityFieldStructure(id, filters, { signal: controller.signal });
          if (payload?.context) {
            dispatch({ type: ActionType.SET_CONTEXT, payload: { kind: "entity", id: payload.context.entity } });
          }
        }

        if (!payload) {
          throw new Error("empty_payload");
        }

        dispatch({
          type: ActionType.SET_DATA,
          payload: {
            tree: payload.tree,
            matches: payload.matches,
            availableValueTypes: payload.availableValueTypes,
          },
        });
        dispatch({
          type: ActionType.SET_FILTERS,
          payload: {
            query: payload.query ?? filters.query ?? "",
            valueTypes: payload.valueTypeFilter ?? filters.valueTypes ?? [],
          },
        });
        dispatch({ type: ActionType.SET_LOADING, payload: { loading: "idle", error: null } });
      } catch (error: any) {
        if (controller.signal.aborted) {
          return;
        }
        const message = error?.response?.data?.detail ?? error?.message ?? "Не удалось загрузить структуру";
        dispatch({ type: ActionType.SET_LOADING, payload: { loading: "error", error: message } });
      }
    },
    [state.contextKind, state.contextId, state.filters.query, state.filters.valueTypes, state.documentContext],
  );

  const loadContextOptions = React.useCallback(async () => {
    dispatch({ type: ActionType.SET_CONTEXT_LOADING, payload: true });
    try {
      const [documents, entities] = await Promise.all([
        fetchDocumentContexts().catch(() => [] as DocumentFieldContext[]),
        fetchEntityContexts().catch(() => [] as EntityFieldContext[]),
      ]);
      dispatch({
        type: ActionType.SET_CONTEXT_OPTIONS,
        payload: {
          documentOptions: documents.map((doc) => ({
            ...doc,
            label: `${doc.schemaName} v${doc.schemaVersion ?? "?"}`,
          })),
          entityOptions: entities.map((ent) => ({ ...ent, label: ent.title })),
        },
      });
    } finally {
      dispatch({ type: ActionType.SET_CONTEXT_LOADING, payload: false });
    }
  }, []);

  React.useEffect(() => {
    void loadContextOptions();
  }, [loadContextOptions]);

  React.useEffect(() => {
    if (!state.open) {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
        activeRequestRef.current = null;
      }
      return;
    }
    if (state.loading === "loading") {
      return;
    }
    if (state.tree.length > 0 || state.matches.length > 0) {
      return;
    }
    void loadStructure();
  }, [state.open, state.loading, state.tree.length, state.matches.length, loadStructure]);

  const actions = React.useMemo<MappingDialogActions>(
    () => ({
      openDialog: (payload) => dispatch({ type: ActionType.OPEN, payload }),
      closeDialog: () => dispatch({ type: ActionType.CLOSE }),
      clearSelection: () => dispatch({ type: ActionType.CLEAR_SELECTION }),
      setMode: (mode) => dispatch({ type: ActionType.SET_MODE, payload: mode }),
      setFilters: (filters) => dispatch({ type: ActionType.SET_FILTERS, payload: filters }),
      setLoading: (loading, error) => dispatch({ type: ActionType.SET_LOADING, payload: { loading, error } }),
      setContext: (kind, id) => dispatch({ type: ActionType.SET_CONTEXT, payload: { kind, id } }),
      setData: (payload) => dispatch({ type: ActionType.SET_DATA, payload }),
      setSelectedTarget: (payload) =>
        dispatch({
          type: ActionType.SET_SELECTED_TARGET,
          payload: {
            target: payload.target,
            compatibility: payload.compatibility ?? null,
            error: payload.error ?? null,
          },
        }),
      confirmSelection: (confirmation) => dispatch({ type: ActionType.CONFIRM_SELECTION, payload: confirmation }),
      loadStructure,
      loadContextOptions,
    }),
    [loadStructure, loadContextOptions],
  );

  const value = React.useMemo<MappingDialogContextValue>(
    () => ({ state, actions }),
    [state, actions],
  );

  return <MappingDialogCtx.Provider value={value}>{children}</MappingDialogCtx.Provider>;
}

export function useMappingDialog(): MappingDialogContextValue {
  const ctx = React.useContext(MappingDialogCtx);
  if (!ctx) throw new Error("useMappingDialog must be used within MappingDialogProvider");
  return ctx;
}

export function useMappingDialogState<T>(selector: (state: MappingDialogState) => T): T {
  const { state } = useMappingDialog();
  return React.useMemo(() => selector(state), [selector, state]);
}
