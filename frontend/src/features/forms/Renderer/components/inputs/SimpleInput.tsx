import * as React from "react";
import type { FieldModel } from "../../../types";
import { pathKey, normalizePathKey } from "@/features/forms/utils/path";
import { inputKind, coerceValue } from "../../../controls";
import { useUiOverrides } from "@/pages/DocumentFill";
import { firstAllowedComponentFor, UI_COMPONENTS, canUseComponent } from "@/features/forms/ui/registry";

type SimpleInputProps = {
  field: FieldModel;
  path: (string | number)[];
  value: unknown;
  onChange: (value: unknown) => void;
};

export function SimpleInput({ field, path, value, onChange }: SimpleInputProps) {
  const ui = useUiOverrides();
  const pathId = normalizePathKey(pathKey(path));
  const manualUi = ui.overrides?.widgets?.[pathId];
  const manualMeta = manualUi ? UI_COMPONENTS.find((meta) => meta.id === manualUi) ?? null : null;

  const facets = field.facets ?? {};
  const hasEnum =
    (Array.isArray(facets.enum) && facets.enum.length > 0) ||
    (Array.isArray((facets as any).enumOptions) && (facets as any).enumOptions.length > 0);

  const kind = hasEnum ? "select" : inputKind(field.dtype, field.facets);

  if (kind === "select") {
    if (manualMeta && canUseComponent(manualMeta, { f: field, isBlock: false })) {
      const Component = manualMeta.Render as React.FC<{
        f: FieldModel;
        path: (string | number)[];
        value: unknown;
        setValue: (next: unknown) => void;
        clearValue?: () => void;
      }>;

      return (
        <Component
          f={field}
          path={path}
          value={value}
          setValue={(next) => onChange(next)}
          clearValue={() => onChange(undefined)}
        />
      );
    }

    type SelectOption = { value: string; label?: string };
    const options: SelectOption[] = React.useMemo(() => {
      const enumOptions = field.facets?.enumOptions as SelectOption[] | undefined;
      if (enumOptions?.length) {
        return enumOptions;
      }
      const enumeration = field.facets?.enum as string[] | undefined;
      return (enumeration ?? []).map((item) => ({ value: String(item) }));
    }, [field.facets]);

    return (
      <select
        className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">— выберите —</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
    );
  }

  if (kind === "number") {
    return (
      <input
        type="number"
        className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
        value={value ?? ""}
        onChange={(event) => onChange(coerceValue(field.dtype, event.target.value))}
      />
    );
  }

  if (kind === "date") {
    const componentMeta =
      manualMeta && canUseComponent(manualMeta, { f: field, isBlock: false })
        ? manualMeta
        : firstAllowedComponentFor(field, false);

    if (componentMeta) {
      const Component = componentMeta.Render as React.FC<{
        f: FieldModel;
        path: (string | number)[];
        value: unknown;
        setValue: (next: unknown) => void;
        clearValue?: () => void;
      }>;

      return (
        <Component
          f={field}
          path={path}
          value={value}
          setValue={(next) => onChange(next)}
          clearValue={() => onChange(undefined)}
        />
      );
    }

    return (
      <input
        type="date"
        className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (manualMeta && canUseComponent(manualMeta, { f: field, isBlock: false })) {
    const Component = manualMeta.Render as React.FC<{
      f: FieldModel;
      path: (string | number)[];
      value: unknown;
      setValue: (next: unknown) => void;
      clearValue?: () => void;
    }>;

    return (
      <Component
        f={field}
        path={path}
        value={value}
        setValue={(next) => onChange(next)}
        clearValue={() => onChange(undefined)}
      />
    );
  }

  return (
    <input
      type="text"
      className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

