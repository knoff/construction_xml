import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import { normalizePathKey } from "@/features/forms-renderer/core/utils/path";
import { useUiOverrides } from "@/features/documents/context";
import { CollapseCtx, LabelOverridesCtx, FormStateCtx } from "./contexts";
import { LabelEditorDialog } from "../components/dialogs/LabelEditorDialog";
import { FieldBlock } from "../components/FieldBlock";
import type { FormStateController } from "./useFormState";
import { MappingDialog } from "@/features/forms-renderer/modules/mapper/components";

type RenderRootProps = {
  fields: FieldModel[];
  types: Record<string, any>;
  stateCtl: FormStateController<any>;
  errors?: Record<string, string[]>;
};

export function RenderRoot({ fields, types, stateCtl, errors }: RenderRootProps) {
  const { state, setPath, delPath } = stateCtl;
  const visited = React.useMemo(() => new Set<string>(), []);
  const collapseStore = React.useRef<Map<string, boolean>>(new Map());

  const getCollapse = React.useCallback(
    (key: string) => collapseStore.current.get(key),
    [],
  );

  const setCollapse = React.useCallback((key: string, value: boolean) => {
    collapseStore.current.set(key, value);
  }, []);

  const ui = useUiOverrides();

  const getLabel = React.useCallback(
    (rawPk: string) => ui.overrides?.labels?.[normalizePathKey(rawPk)],
    [ui.overrides],
  );
  const hasOverride = React.useCallback(
    (rawPk: string) => Boolean(ui.overrides?.labels?.[normalizePathKey(rawPk)]),
    [ui.overrides],
  );
  const setLabel = React.useCallback(
    (rawPk: string, _original: string, value: string | undefined) => {
      const pk = normalizePathKey(rawPk);
      const next = { ...(ui.overrides || {}) };
      next.labels = { ...(next.labels || {}) };
      if (!value) {
        delete next.labels[pk];
      } else {
        next.labels[pk] = value;
      }
      ui.setOverrides(next);
      ui.markDirty();
    },
    [ui],
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const dialogState = React.useRef<{ pathKey: string | null; original: string | null; current?: string | null }>({
    pathKey: null,
    original: null,
    current: undefined,
  });

  const openEditor = React.useCallback(
    (args: { pathKey: string; original: string; current?: string }) => {
      dialogState.current = { ...args };
      setDialogOpen(true);
    },
    [],
  );

  return (
    <CollapseCtx.Provider value={{ get: getCollapse, set: setCollapse }}>
      <LabelOverridesCtx.Provider
        value={{
          items: [],
          getLabel,
          hasOverride,
          editLabel: (override) => setLabel(override.path, override.original, override.value),
          removeLabel: (rawPk) => setLabel(rawPk, "", undefined),
          openEditor,
        }}
      >
        <FormStateCtx.Provider value={{ state, setPath, delPath }}>
          <div className="space-y-4">
            {fields.map((f) => (
              <FieldBlock
                key={f.name}
                field={f}
                path={[f.name]}
                state={state}
                setPath={setPath}
                delPath={delPath}
                types={types}
                visitedTypes={visited}
                errors={errors}
              />
            ))}
          </div>
          <LabelEditorDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            pathKey={dialogState.current.pathKey}
            original={dialogState.current.original}
            current={dialogState.current.current}
            onSave={(value) => {
              const raw = dialogState.current.pathKey;
              const original = dialogState.current.original ?? "";
              if (raw) {
                setLabel(raw, original, value);
              }
            }}
          />
        </FormStateCtx.Provider>
      </LabelOverridesCtx.Provider>
      <MappingDialog />
    </CollapseCtx.Provider>
  );
}


