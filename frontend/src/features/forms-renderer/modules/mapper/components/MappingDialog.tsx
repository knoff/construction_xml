import * as React from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useMappingDialog,
  useMappingDialogState,
  checkValueTypeCompatibility,
  type MappingDialogContextKind,
  type MappingDocumentContext,
  type MappingEntityContext,
  type MappingDocumentOption,
  type MappingEntityOption,
  type MappingConfirmation,
} from "../runtime";
import { Input } from "@/components/ui/input";
import { FieldTreePanel, SearchResultsPanel } from "./FieldPanels";
import type { FieldMeta } from "../adapters/api";
import { ChevronDown } from "lucide-react";
import { useValueLinks } from "@/features/forms-renderer/hooks/useValueLinks";
import { buildMappingKey } from "@/features/forms-renderer/core/utils/path";

export function MappingDialog() {
  const { state, actions } = useMappingDialog();
  const valueLinks = useValueLinks();
  const open = state.open;

  const anchorLabel = state.anchorLabel ?? "Поле формы";
  const anchorPath = state.anchorPath?.join(".") ?? "—";
  const anchorValueType = state.anchorValueType;
  const mode = state.mode;
  const loading = state.loading;
  const error = state.error;
  const query = state.filters.query;
  const valueTypes = state.filters.valueTypes;
  const availableValueTypes = state.availableValueTypes;
  const compatibility = state.selectedTargetCompatibility;
  const canConfirm = Boolean(
    state.selectedTarget
      && state.sourceKey
      && (compatibility?.compatible !== false),
  );
  const [saving, setSaving] = React.useState(false);

  const handleClose = React.useCallback(() => {
    actions.closeDialog();
  }, [actions]);

  const contextKind = state.contextKind;
  const contextId = state.contextId;

  const documentContext = state.documentContext;
  const entityContexts = state.entityContexts ?? [];
  const documentOptions = state.documentOptions;
  const entityOptions = state.entityOptions;
  const contextLoading = state.contextLoading;

  const handleRefresh = React.useCallback(() => {
    void actions.loadStructure();
  }, [actions]);

  const [searchValue, setSearchValue] = React.useState(query);

  React.useEffect(() => {
    setSearchValue(query);
  }, [query]);

  const handleFilterSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const normalized = searchValue.trim();
      actions.setFilters({ query: normalized });
      void actions.loadStructure({ query: normalized });
    },
    [actions, searchValue],
  );

  const handleValueTypesChange = React.useCallback(
    (valueType: string) => {
      const exists = state.filters.valueTypes.includes(valueType);
      const next = exists
        ? state.filters.valueTypes.filter((item) => item !== valueType)
        : [...state.filters.valueTypes, valueType];
      actions.setFilters({ valueTypes: next });
      void actions.loadStructure({ valueTypes: next });
    },
    [actions, state.filters.valueTypes],
  );

  const handleSelectField = React.useCallback(
    (field: FieldMeta) => {
      const target = {
        key: field.path,
        label: field.label,
        valueType: field.valueType ?? null,
        path: field.path,
      };
      const compatibilityResult = checkValueTypeCompatibility(anchorValueType ?? null, field.valueType ?? null);
      const errorMessage = compatibilityResult.compatible ? null : (compatibilityResult.reason ?? compatibilityResult.note ?? "Типы поля формы и цели сопоставления несовместимы");
      actions.setSelectedTarget({
        target,
        compatibility: compatibilityResult,
        error: errorMessage,
      });
    },
    [actions, anchorValueType],
  );

  const handleSelectDocumentOption = React.useCallback(
    async (option: MappingDocumentOption) => {
      actions.setContext("document", option.schemaId);
      actions.setMode("tree");
      actions.setFilters({ query: "", valueTypes: [] });
      actions.setData({ tree: [], matches: [], availableValueTypes: [] });
      await actions.loadStructure({ kind: "document", id: option.schemaId, query: "", valueTypes: [] });
    },
    [actions],
  );

  const handleSelectEntityOption = React.useCallback(
    async (option: MappingEntityOption) => {
      actions.setContext("entity", option.entity);
      actions.setMode("tree");
      actions.setFilters({ query: "", valueTypes: [] });
      actions.setData({ tree: [], matches: [], availableValueTypes: [] });
      await actions.loadStructure({ kind: "entity", id: option.entity, query: "", valueTypes: [] });
    },
    [actions],
  );

  const handleConfirmSelection = React.useCallback(
    async () => {
      if (!state.selectedTarget) {
        return;
      }
      if (!state.sourceKey) {
        actions.setSelectedTarget({
          target: state.selectedTarget,
          compatibility: state.selectedTargetCompatibility ?? null,
          error: "Не удалось определить ключ источника для сопоставления.",
        });
        return;
      }
      if (state.selectedTargetCompatibility?.compatible === false) {
        actions.setSelectedTarget({
          target: state.selectedTarget,
          compatibility: state.selectedTargetCompatibility,
          error: state.selectionError ?? state.selectedTargetCompatibility.reason ?? "Типы несопоставимы.",
        });
        return;
      }

      const targetPathSegments: (string | number)[] = state.selectedTarget.path ? state.selectedTarget.path.split(".") : [];
      let targetKey: string | null = null;

      if (state.contextKind === "document") {
        const docCtx = state.documentContext;
        if (!docCtx?.schemaCode || !docCtx?.schemaVersion) {
          actions.setSelectedTarget({
            target: state.selectedTarget,
            compatibility: state.selectedTargetCompatibility ?? null,
            error: "Не удалось определить схему для сопоставления.",
          });
          return;
        }
        targetKey = buildMappingKey(docCtx.schemaCode, docCtx.schemaVersion, targetPathSegments) ?? null;
      } else if (state.contextKind === "entity") {
        if (typeof state.contextId !== "string" || !state.contextId) {
          actions.setSelectedTarget({
            target: state.selectedTarget,
            compatibility: state.selectedTargetCompatibility ?? null,
            error: "Не удалось определить сущность для сопоставления.",
          });
          return;
        }
        const suffix = state.selectedTarget.path ? `.${state.selectedTarget.path}` : "";
        targetKey = `${state.contextId}${suffix}`;
      }

      if (!targetKey) {
        actions.setSelectedTarget({
          target: state.selectedTarget,
          compatibility: state.selectedTargetCompatibility ?? null,
          error: "Не удалось сформировать ключ целевого поля.",
        });
        return;
      }

      setSaving(true);
      try {
        const compatibilityData = state.selectedTargetCompatibility ?? checkValueTypeCompatibility(state.anchorValueType ?? null, state.selectedTarget.valueType ?? null);
        const meta = {
          source: {
            key: state.sourceKey,
            label: state.anchorLabel,
            path: state.anchorPath?.join(".") ?? null,
            valueType: state.anchorValueType ?? null,
          },
          target: {
            key: targetKey,
            label: state.selectedTarget.label,
            path: state.selectedTarget.path ?? null,
            valueType: state.selectedTarget.valueType ?? null,
          },
          compatibility: compatibilityData,
          confirmed_at: new Date().toISOString(),
        } as const;

        await valueLinks.link({ sourceKey: state.sourceKey, targetKey, meta });
        if (state.anchorPath) {
          void valueLinks.refreshLinks(state.anchorPath);
        }

        const confirmation: MappingConfirmation = {
          sourceKey: state.sourceKey,
          anchorValueType: state.anchorValueType ?? null,
          target: state.selectedTarget,
          targetContext: {
            kind: state.contextKind,
            id: state.contextId,
          },
          compatibility: compatibilityData,
          confirmedAt: Date.now(),
        };

        actions.confirmSelection(confirmation);
        actions.closeDialog();
      } catch (error: any) {
        const message = error?.response?.data?.detail ?? error?.message ?? "Не удалось сохранить сопоставление.";
        actions.setSelectedTarget({
          target: state.selectedTarget,
          compatibility: state.selectedTargetCompatibility ?? null,
          error: message,
        });
      } finally {
        setSaving(false);
      }
    },
    [actions, state.selectedTarget, state.sourceKey, state.selectedTargetCompatibility, state.selectionError, state.anchorValueType, state.contextKind, state.contextId, state.documentContext, state.anchorLabel, state.anchorPath, valueLinks],
  );

  const handleConfirmClick = React.useCallback(() => {
    void handleConfirmSelection();
  }, [handleConfirmSelection]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? actions.openDialog({ anchorPath: state.anchorPath ?? [] }) : actions.closeDialog())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сопоставление значения</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <section className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Источник</div>
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="text-sm font-semibold text-slate-800">{anchorLabel}</div>
              <div className="flex items-center gap-1">
                <span>Путь:</span>
                <code className="font-mono text-[11px] text-slate-500">{anchorPath}</code>
              </div>
              {state.anchorValueType ? (
                <div className="mt-1 flex items-center gap-1">
                  <span>Тип значения:</span>
                  <code className="font-mono text-[11px] text-slate-500">{state.anchorValueType}</code>
                </div>
              ) : null}
            </div>
          </section>

          <ContextSelector
            documentContext={documentContext}
            entityContexts={entityContexts}
            documentOptions={documentOptions}
            entityOptions={entityOptions}
            activeKind={contextKind}
            activeId={contextId}
            onSelectDocument={handleSelectDocumentOption}
            onSelectEntity={handleSelectEntityOption}
            loading={contextLoading}
          />

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs ${mode === "tree" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
                  onClick={() => actions.setMode("tree")}
                >
                  Навигация по дереву
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs ${mode === "search" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
                  onClick={() => actions.setMode("search")}
                >
                  Поиск
                </button>
              </div>
              {mode === "search" ? (
                <form className="flex flex-wrap items-center gap-2" onSubmit={handleFilterSubmit}>
                  <Input
                    name="query"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Название поля или путь"
                    className="h-8 w-56 text-sm"
                    autoComplete="off"
                    aria-label="Поиск по полям"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border px-3 py-1 text-xs"
                      onClick={() => {
                        setSearchValue("");
                        actions.setFilters({ query: "", valueTypes: [] });
                        void actions.loadStructure({ query: "", valueTypes: [] });
                      }}
                    >
                      Сбросить
                    </button>
                    <button
                      type="submit"
                      className="rounded border px-3 py-1 text-xs"
                      disabled={loading === "loading"}
                    >
                      Применить
                    </button>
                  </div>
                </form>
              ) : null}
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                {loading === "loading" ? <span>Загрузка…</span> : null}
                {loading === "error" && error ? <span className="text-red-600">Ошибка: {error}</span> : null}
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={handleRefresh}
                  disabled={loading === "loading"}
                >
                  Обновить
                </button>
              </div>
            </div>

            {mode === "search" ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="uppercase tracking-wide">Фильтр по типу:</span>
                {availableValueTypes.length ? (
                  availableValueTypes.map((type) => {
                    const active = valueTypes.includes(type);
                    return (
                      <button
                        type="button"
                        key={type}
                        className={`rounded-full border px-3 py-1 text-xs ${active ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}
                        onClick={() => handleValueTypesChange(type)}
                      >
                        {type}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-400">Типы не определены</span>
                )}
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-200">
              {mode === "tree" ? (
                <FieldTreePanel
                  nodes={state.tree}
                  onSelect={handleSelectField}
                  selectedPath={state.selectedTarget?.path ?? null}
                  disabled={loading === "loading"}
                />
              ) : (
                <SearchResultsPanel
                  items={state.matches}
                  onSelect={handleSelectField}
                  selectedPath={state.selectedTarget?.path ?? null}
                  disabled={loading === "loading"}
                />
              )}
            </div>
          </section>

          <section className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Выбранное сопоставление</div>
            <SelectedTargetPreview />
          </section>
        </DialogBody>
        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <div className="text-xs text-slate-500">
              {state.selectedTarget ? `Выбрано сопоставление: ${state.selectedTarget.label}` : "Сопоставление не выбрано"}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                Закрыть
              </Button>
              <Button variant="outline" onClick={() => actions.clearSelection()} disabled={!state.selectedTarget}>
                Очистить
              </Button>
              <Button disabled={!canConfirm || saving} onClick={handleConfirmClick}>
                {saving ? "Сохранение…" : "Сохранить сопоставление"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ContextSelectorProps = {
  documentContext: MappingDocumentContext | null;
  entityContexts: MappingEntityContext[];
  documentOptions: MappingDocumentOption[];
  entityOptions: MappingEntityOption[];
  activeKind: MappingDialogContextKind;
  activeId: number | string | null;
  onSelectDocument: (option: MappingDocumentOption) => void;
  onSelectEntity: (option: MappingEntityOption) => void;
  loading: boolean;
};

function ContextSelector({
  documentContext,
  entityContexts,
  documentOptions,
  entityOptions,
  activeKind,
  activeId,
  onSelectDocument,
  onSelectEntity,
  loading,
}: ContextSelectorProps) {
  const resolvedDocumentOptions = React.useMemo(() => {
    if (documentOptions.length) return documentOptions;
    const ctx = documentContext;
    if (!ctx || !ctx.schemaId || !ctx.schemaName) {
      return [] as MappingDocumentOption[];
    }
    return [
      {
        kind: "document",
        schemaId: ctx.schemaId,
        schemaCode: ctx.schemaCode ?? null,
        schemaTitle: ctx.schemaName ?? null,
        schemaName: ctx.schemaName,
        schemaVersion: ctx.schemaVersion ?? null,
        description: ctx.description ?? null,
        updatedAt: null,
        hasUiOverrides: false,
        label: `${ctx.schemaName} v${ctx.schemaVersion ?? "?"}`,
      },
    ] satisfies MappingDocumentOption[];
  }, [documentOptions, documentContext]);

  const resolvedEntityOptions = React.useMemo(() => {
    if (entityOptions.length) return entityOptions;
    if (!entityContexts.length) {
      return [] as MappingEntityOption[];
    }
    return entityContexts.map((context) => ({
      kind: "entity" as const,
      entity: context.entity,
      title: context.title,
      description: context.description ?? null,
      label: context.title,
    })) satisfies MappingEntityOption[];
  }, [entityOptions, entityContexts]);

  const selectedDocumentOption = React.useMemo(() => {
    if (activeKind !== "document" || typeof activeId !== "number") return null;
    return resolvedDocumentOptions.find((option) => option.schemaId === activeId) ?? null;
  }, [resolvedDocumentOptions, activeKind, activeId]);

  const selectedEntityOption = React.useMemo(() => {
    if (activeKind !== "entity" || typeof activeId !== "string") return null;
    return resolvedEntityOptions.find((option) => option.entity === activeId) ?? null;
  }, [resolvedEntityOptions, activeKind, activeId]);

  const documentDescription = selectedDocumentOption?.label
    ?? (documentContext?.schemaName ? `${documentContext.schemaName} v${documentContext.schemaVersion ?? "?"}` : "Схема не выбрана");

  const entityDescription = selectedEntityOption?.label ?? "Сущность не выбрана";

  return (
    <section className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">Контекст сопоставления</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <ContextDropdown
          title="Схемы"
          description={documentDescription}
          active={activeKind === "document"}
          loading={loading}
          options={resolvedDocumentOptions}
          onSelectOption={onSelectDocument}
          fallbackText={!resolvedDocumentOptions.length ? "Схемы недоступны" : undefined}
          isOptionSelected={(option) => activeKind === "document" && typeof activeId === "number" && option.schemaId === activeId}
          getOptionKey={(option) => `schema-${option.schemaId}`}
          renderOption={(option) => (
            <div className="flex flex-col gap-1">
              <div className="font-medium text-slate-800">{option.label}</div>
              <div className="text-xs text-slate-500">Версия {option.schemaVersion ?? "?"}</div>
            </div>
          )}
        />
        <ContextDropdown
          title="Сущности"
          description={entityDescription}
          active={activeKind === "entity"}
          loading={loading}
          options={resolvedEntityOptions}
          onSelectOption={onSelectEntity}
          fallbackText={!resolvedEntityOptions.length ? "Сущности недоступны" : undefined}
          isOptionSelected={(option) => activeKind === "entity" && typeof activeId === "string" && option.entity === activeId}
          getOptionKey={(option) => `entity-${option.entity}`}
          renderOption={(option) => (
            <div className="flex flex-col gap-1">
              <div className="font-medium text-slate-800">{option.label}</div>
            </div>
          )}
        />
      </div>
    </section>
  );
}

type ContextDropdownProps<Option extends { label: string }> = {
  title: string;
  description: string;
  active?: boolean;
  loading?: boolean;
  options: Option[];
  fallbackText?: string;
  onSelectOption: (option: Option) => void;
  isOptionSelected?: (option: Option) => boolean;
  getOptionKey?: (option: Option) => string;
  renderOption: (option: Option) => React.ReactNode;
};

function ContextDropdown<Option extends { label: string }>({
  title,
  description,
  active,
  loading,
  options,
  fallbackText,
  onSelectOption,
  isOptionSelected,
  getOptionKey,
  renderOption,
}: ContextDropdownProps<Option>) {
  const [open, setOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleSelect = React.useCallback(
    (option: Option) => {
      onSelectOption(option);
      setOpen(false);
    },
    [onSelectOption],
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-full w-full cursor-pointer flex-col justify-between gap-2 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${active ? "border-slate-900 bg-slate-900/5" : "border-slate-200 bg-white hover:border-slate-300"}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{description}</div>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open ? (
        <div className="absolute z-50 mt-2 w-full min-w-[16rem] rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {loading && !options.length ? (
            <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
              Загрузка контекстов…
            </div>
          ) : null}
          {!loading && !options.length ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
              {fallbackText ?? "Нет доступных элементов"}
            </div>
          ) : null}
          {options.map((option) => {
            const key = getOptionKey ? getOptionKey(option) : option.label;
            const selected = isOptionSelected?.(option) ?? false;
            return (
              <button
                key={key}
                type="button"
                className={`w-full rounded border px-3 py-2 text-left text-sm transition ${selected ? "border-slate-400 bg-slate-100" : "border-transparent hover:border-slate-300 hover:bg-slate-50"}`}
                onClick={() => handleSelect(option)}
              >
                {renderOption(option)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SelectedTargetPreview() {
  const { selected, compatibility, selectionError, anchorValueType } = useMappingDialogState((state) => ({
    selected: state.selectedTarget,
    compatibility: state.selectedTargetCompatibility,
    selectionError: state.selectionError,
    anchorValueType: state.anchorValueType,
  }));

  if (!selected) {
    return (
      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
        Сопоставление ещё не выбрано. Выберите поле в панели выше.
      </div>
    );
  }

  const status = selectionError || compatibility?.compatible === false ? "error" : compatibility ? "ok" : "pending";
  let containerClass = "space-y-3 rounded border px-3 py-4 text-sm text-slate-700";
  if (status === "error") {
    containerClass += " border-red-200 bg-red-50";
  } else if (status === "ok") {
    containerClass += " border-emerald-200 bg-emerald-50";
  } else {
    containerClass += " border-slate-200 bg-slate-50";
  }

  const sourceType = anchorValueType ?? compatibility?.sourceType ?? null;
  const targetType = selected.valueType ?? compatibility?.targetType ?? null;

  let statusMessage: string;
  if (selectionError) {
    statusMessage = selectionError;
  } else if (compatibility?.compatible === false) {
    statusMessage = compatibility.reason ?? compatibility.note ?? "Типы источника и цели не совместимы.";
  } else if (compatibility?.compatible === true) {
    statusMessage = compatibility.note ?? "Типы источника и цели совместимы.";
  } else {
    statusMessage = "Совместимость будет проверена при выборе поля.";
  }

  const statusClass =
    status === "error"
      ? "text-red-600"
      : status === "ok"
        ? "text-emerald-600"
        : "text-slate-500";

  return (
    <div className={containerClass}>
      <div className="font-medium text-slate-900">{selected.label}</div>
      {selected.path ? (
        <div className="text-xs text-slate-600">
          Путь: <code>{selected.path}</code>
        </div>
      ) : null}
      <div className="space-y-1 text-xs text-slate-600">
        <div>
          Тип источника: <code>{sourceType ?? "—"}</code>
        </div>
        <div>
          Тип цели: <code>{targetType ?? "—"}</code>
        </div>
      </div>
      <div className={`text-xs ${statusClass}`}>{statusMessage}</div>
    </div>
  );
}

