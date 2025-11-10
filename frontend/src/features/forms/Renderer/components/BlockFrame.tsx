import * as React from "react";
import type { FieldModel } from "../../types";
import { pathKey, normalizePathKey } from "@/features/forms/utils/path";
import { minMaxText, isRequiredField } from "@/features/forms/utils/xsd";
import { useCollapse, useLabelOverrides } from "../contexts";
import { UiOverrideBadge } from "./UiOverrideBadge";

type BlockFrameProps = {
  field: FieldModel;
  path: (string | number)[];
  isBlock: boolean;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  hasError?: boolean;
  errsHere?: string[];
  errCount?: number;
  errPreview?: string[];
};

export function BlockFrame({
  field,
  path,
  isBlock,
  headerExtra,
  children,
  hasError,
  errsHere,
  errCount,
  errPreview,
}: BlockFrameProps) {
  const { get, set } = useCollapse();
  const { getLabel, hasOverride, openEditor } = useLabelOverrides();
  const pathKeyValue = pathKey(path);

  const initial = get(pathKeyValue);
  const [open, setOpen] = React.useState<boolean>(
    typeof initial === "boolean" ? initial : isBlock ? false : true,
  );

  React.useEffect(() => {
    set(pathKeyValue, open);
  }, [open, pathKeyValue, set]);

  const overriddenLabel = getLabel(pathKeyValue);
  const baseLabel = field.documentation?.label ?? field.name;
  const displayLabel = overriddenLabel ?? baseLabel;
  const labelHighlighted = hasOverride(pathKeyValue);
  const required = isBlock && isRequiredField(field);

  const typeBadgeLabel =
    field?.refType ? String(field.refType) : field?.dtype ? String(field.dtype) : "object";

  const handleToggle = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setOpen((prev) => !prev);
    },
    [],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-7 w-7 flex-none shrink-0 inline-flex items-center justify-center rounded border text-xs leading-none p-0"
            onClick={handleToggle}
            aria-label={open ? "Свернуть" : "Развернуть"}
          >
            {open ? "−" : "+"}
          </button>

          <label className="text-sm font-semibold">
            {displayLabel}
            {required ? " *" : ""}
            {isBlock && (
              <span className="text-[10px] text-zinc-500 ml-1">{minMaxText(field)}</span>
            )}
          </label>

          <button
            type="button"
            className={`rounded-full border px-2 py-0.5 text-[10px] leading-none ${
              labelHighlighted ? "bg-amber-50 border-amber-300" : "opacity-70 hover:opacity-100"
            }`}
            title="Изменить подпись блока"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openEditor({ pathKey: pathKeyValue, original: baseLabel, current: overriddenLabel });
            }}
          >
            Label
          </button>

          {isBlock && (
            <UiOverrideBadge
              field={field}
              path={path}
              kind="block"
              onReset={() => {
                /* no-op; badge handles state */
              }}
            />
          )}

          {isBlock && (
            <button
              type="button"
              className="rounded-full border px-2 py-0.5 text-[10px] leading-none opacity-70 hover:opacity-100"
              title="Клик — вывести информацию о блоке в консоль"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                try {
                  console.groupCollapsed(`[BLOCK] ${typeBadgeLabel} @ ${pathKeyValue}`);
                  console.log({
                    pathArray: path,
                    path: pathKeyValue,
                    field,
                    isBlock,
                  });
                  console.groupEnd();
                } catch {
                  console.info("[BLOCK]", { pathArray: path, path: pathKeyValue, field, isBlock });
                }
              }}
            >
              {typeBadgeLabel}
            </button>
          )}
        </div>

        {hasError ? (
          <span
            className="ml-1 inline-flex items-center rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] leading-none text-red-700"
            title={
              errPreview && errPreview.length > 0
                ? errPreview.join("\n")
                : errsHere && errsHere.length
                ? errsHere.join("\n")
                : "Есть ошибки в разделе"
            }
          >
            Ошибки
            {typeof errCount === "number"
              ? `: ${errCount}`
              : errsHere && errsHere.length
              ? `: ${errsHere.length}`
              : ""}
          </span>
        ) : null}

        {headerExtra}
      </div>

      {open && (
        <div
          className={
            isBlock
              ? `rounded-2xl border-2 p-4 grid gap-3 bg-[rgba(0,0,0,0.02)] ${hasError ? "border-red-500" : ""}`
              : `rounded-xl border p-3 grid gap-3 ${hasError ? "border-red-500" : ""}`
          }
        >
          {children}

          {errsHere && errsHere.length > 0 && (
            <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
              {errsHere.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

