import * as React from "react";
import type { FieldModel } from "../../types";
import { pathKey } from "@/features/forms/utils/path";
import { RowLayoutContext } from "@/features/forms/ui/block-row";
import { isRequiredField } from "@/features/forms/utils/xsd";
import { UiOverrideBadge } from "./UiOverrideBadge";
import { useLabelOverrides } from "../contexts";

type FieldLabelProps = {
  field: FieldModel;
  path: (string | number)[];
};

export function FieldLabel({ field, path }: FieldLabelProps) {
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

