import * as React from "react";
import type { FieldModel } from "../../types";
import { pathKey, type Path } from "@/features/forms/utils/path";
import { RowLayoutContext } from "@/features/forms/ui/block-row";
import { isRequiredField } from "@/features/forms/utils/xsd";
import { UiOverrideBadge } from "./UiOverrideBadge";
import { useLabelOverrides } from "../contexts";
import { ValueLinkStatusBadge } from "@/features/forms/ui/components/ValueLinkStatus";
import { useValueLinkStatus, useValueLinks } from "@/features/forms/hooks/useValueLinks";
import { useMappingDialog, useMappingDialogState } from "@/features/forms/valueMapping/store";
import { CheckCircle2, AlertTriangle } from "lucide-react";

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

function inferFieldValueType(field: FieldModel): string | null {
  if (field.kind === "choice") return "choice";
  const dtype = field.dtype?.toLowerCase() ?? "";
  if (dtype === "object" || dtype === "xs:anytype" || dtype === "anytype" || field.kind === "sequence") {
    return "object";
  }
  if (dtype.includes("boolean")) return "boolean";
  if (/(date|time)$/.test(dtype)) return "datetime";
  if (/(integer|decimal|float|double|number)$/.test(dtype)) return "number";
  return dtype ? "string" : null;
}

export function FieldLabel({ field, path, value, enableValueLink = true }: FieldLabelProps) {
  const { getLabel, hasOverride, openEditor } = useLabelOverrides();
  const pathKeyValue = pathKey(path);
  const original = field.documentation?.label ?? field.name;
  const overridden = getLabel(pathKeyValue);
  const displayValue = overridden ?? original;
  const highlighted = hasOverride(pathKeyValue);
  const required = isRequiredField(field);
  const valueType = React.useMemo(() => inferFieldValueType(field), [field]);
  const confirmedMapping = useMappingDialogState((state) => state.confirmedMapping);
  const isMappedToField = React.useMemo(() => {
    if (!confirmedMapping) return false;
    return confirmedMapping.sourceKey === pathKey(path);
  }, [confirmedMapping, path]);
  const mappingNote = React.useMemo(() => {
    if (!confirmedMapping || !isMappedToField) return null;
    const target = confirmedMapping.target;
    return {
      label: target.label,
      path: target.path ?? target.key,
      valueType: target.valueType ?? confirmedMapping.compatibility?.targetType ?? null,
      compatible: confirmedMapping.compatibility?.compatible !== false,
      note: confirmedMapping.compatibility?.note ?? confirmedMapping.compatibility?.reason ?? null,
    };
  }, [confirmedMapping, isMappedToField]);

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
        {enableValueLink ? (
          <FieldValueLinkControls
            path={path}
            value={value}
            label={displayValue ?? ""}
            valueType={valueType}
            mappingNote={mappingNote}
          />
        ) : null}
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
  label,
  valueType,
  mappingNote,
}: {
  path: Path;
  value: unknown;
  label: string;
  valueType: string | null;
  mappingNote?: {
    label: string;
    path?: string | null;
    valueType?: string | null;
    compatible: boolean;
    note: string | null;
  } | null;
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
  const { actions } = useMappingDialog();

  const canConfigure = Boolean(mappingKey);

  const handleOpenDialog = React.useCallback(() => {
    if (!mappingKey) return;
    actions.openDialog({
      anchorPath: path,
      anchorLabel: label,
      anchorValueType: valueType ?? null,
      sourceKey: mappingKey,
    });
  }, [actions, label, mappingKey, path, valueType]);

  const handleCheck = React.useCallback(() => {
    if (!canCheck) return;
    void valueLinks.check(path, normalizedValue ?? value ?? null);
  }, [canCheck, valueLinks, path, normalizedValue, value]);

  return (
    <div className="ml-auto flex items-center gap-2 text-xs text-zinc-600">
      {mappingNote && (
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
            mappingNote.compatible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
          title={
            mappingNote.note
              ? `${mappingNote.label}${mappingNote.path ? ` \nПуть: ${mappingNote.path}` : ""}\n${mappingNote.note}`
              : mappingNote.path
                ? `${mappingNote.label}\nПуть: ${mappingNote.path}`
                : mappingNote.label
          }
        >
          {mappingNote.compatible ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          <span className="max-w-[10rem] truncate" title={mappingNote.label}>{mappingNote.label}</span>
        </button>
      )}
      <button
        type="button"
        className="h-7 rounded-[var(--radius)] border px-2 text-xs disabled:opacity-50"
        onClick={handleOpenDialog}
        disabled={!canConfigure}
      >
        Сопоставить
      </button>
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

