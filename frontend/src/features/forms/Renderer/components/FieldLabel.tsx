import * as React from "react";
import type { FieldModel } from "../../types";
import { pathKey } from "@/features/forms/utils/path";
import { RowLayoutContext } from "@/features/forms/ui/block-row";
import { isRequiredField } from "@/features/forms/utils/xsd";
import { UiOverrideBadge } from "./UiOverrideBadge";
import { useLabelOverrides } from "../contexts";
import { ValueLinkStatusBadge } from "@/features/forms/ui/components/ValueLinkStatus";
import { useValueLinkStatus, useValueLinks } from "@/features/forms/hooks/useValueLinks";

type FieldLabelProps = {
  field: FieldModel;
  path: (string | number)[];
  value?: unknown;
  enableValueLink?: boolean;
};

function normalizeValueForCheck(raw: unknown) {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : "";
  }
  return raw;
}

function hasCheckableValue(value: unknown) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.length > 0;
  }

  return true;
}

export function FieldLabel({ field, path, value, enableValueLink = true }: FieldLabelProps) {
  const { getLabel, hasOverride, openEditor } = useLabelOverrides();
  const pathKeyValue = pathKey(path);
  const original = field.documentation?.label ?? field.name;
  const overridden = getLabel(pathKeyValue);
  const displayValue = overridden ?? original;
  const highlighted = hasOverride(pathKeyValue);
  const required = isRequiredField(field);

  type RowLayoutContextValue = { labelLines?: number };

  const lines =
    typeof RowLayoutContext !== "undefined"
      ? (React.useContext(RowLayoutContext as React.Context<RowLayoutContextValue>)?.labelLines ?? 1)
      : 2;

  const lineRem = 1.25;
  const clampStyle: React.CSSProperties = { height: `${(lines === 1 ? 1 : 2) * lineRem}rem` };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded-full border px-2 py-0.5 text-[10px] leading-none ${
              highlighted ? "bg-amber-50 border-amber-300" : "opacity-70 hover:opacity-100"
            }`}
            title="Изменить подпись (Label)"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openEditor({ pathKey: pathKeyValue, original, current: overridden });
            }}
          >
            Label
          </button>
          <UiOverrideBadge field={field} path={path} kind="field" />
        </div>
        {enableValueLink ? <FieldValueLinkControls path={path} value={value} /> : null}
      </div>
      <label className="text-sm font-medium">
        <span className="inline-flex max-w-full items-start gap-1 align-top">
          <span
            className="min-w-0 overflow-hidden leading-5 [display:-webkit-box] [-webkit-box-orient:vertical]"
            style={clampStyle}
            title={displayValue}
          >
            {displayValue}
          </span>
          {required ? <span aria-hidden="true" className="leading-5">*</span> : null}
        </span>
      </label>
    </div>
  );
}

function FieldValueLinkControls({
  path,
  value,
}: {
  path: (string | number)[];
  value: unknown;
}) {
  const valueLinks = useValueLinks();
  const status = useValueLinkStatus(path);
  const mappingKey = React.useMemo(() => valueLinks.buildKey(path), [valueLinks, path]);
  const normalizedValue = React.useMemo(() => normalizeValueForCheck(value), [value]);
  const canCheck = React.useMemo(
    () => Boolean(mappingKey && hasCheckableValue(normalizedValue)),
    [mappingKey, normalizedValue],
  );
  const checking = status?.state === "loading";

  const handleCheck = React.useCallback(() => {
    if (!canCheck) return;
    void valueLinks.check(path, normalizedValue ?? value ?? null);
  }, [canCheck, valueLinks, path, normalizedValue, value]);

  return (
    <div className="ml-auto flex items-center gap-2 text-xs text-zinc-600">
      <ValueLinkStatusBadge status={status} available={Boolean(mappingKey)} />
      <button
        type="button"
        className="h-7 rounded-[var(--radius)] border px-2 text-xs disabled:opacity-50"
        onClick={handleCheck}
        disabled={!canCheck || checking}
      >
        {checking ? "Проверка…" : "Проверить"}
      </button>
    </div>
  );
}

