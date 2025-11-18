import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import { getAtPath, pathKey } from "@/features/forms-renderer/core/utils/path";
import { countSubtreeErrors } from "@/features/forms-renderer/core/utils/errors";
import { FieldLabel } from "../FieldLabel";
import { HelpText } from "../HelpText";

type RenderFieldFn = (field: FieldModel, path: (string | number)[]) => React.ReactNode;

type ArrayChoiceProps = {
  field: FieldModel;
  path: (string | number)[];
  state: unknown;
  setPath: (path: (string | number)[], value: unknown) => void;
  delPath: (path: (string | number)[]) => void;
  renderField: RenderFieldFn;
  errors?: Record<string, string[]>;
};

export function ArrayChoice({
  field,
  path,
  state,
  setPath,
  delPath,
  renderField,
  errors,
}: ArrayChoiceProps) {
  const thisKey = pathKey(path);
  const nodeErrors = errors?.[thisKey] ?? [];

  const options = React.useMemo(
    () => (field.children ?? []).filter((child) => child.kind !== "attribute"),
    [field.children],
  );

  const rawValue = getAtPath(state, path);
  const items = Array.isArray(rawValue) ? rawValue : [];

  React.useEffect(() => {
    if (rawValue != null && !Array.isArray(rawValue)) {
      setPath(path, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(rawValue)]);

  const deriveSelected = React.useCallback(
    (container: Record<string, unknown>) => {
      for (const option of options.filter((opt) => opt.kind !== "sequence")) {
        if (Object.prototype.hasOwnProperty.call(container, option.name)) {
          return option.name;
        }
      }

      const sequenceOption = options.find((opt) => opt.kind === "sequence");
      if (
        sequenceOption?.children?.some((child) =>
          Object.prototype.hasOwnProperty.call(container, child.name),
        )
      ) {
        return sequenceOption.name;
      }

      return options[0]?.name ?? null;
    },
    [options],
  );

  const hasSubtreeErrors = React.useMemo(
    () => countSubtreeErrors(errors ?? {}, thisKey).count > 0,
    [errors, thisKey],
  );

  return (
    <div className="space-y-2">
      <FieldLabel
        field={{ ...field, documentation: field.documentation ?? { label: "Варианты" } }}
        path={path}
        value={items}
        enableValueLink={false}
      />
      <div className={`space-y-3 ${hasSubtreeErrors ? "border border-red-500 rounded-xl p-3" : ""}`}>
        {items.map((item, index) => {
          const selected = deriveSelected(item as Record<string, unknown>);
          return (
            <div key={index} className="rounded-xl border p-3 space-y-3">
              <select
                className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                value={selected ?? ""}
                onChange={(event) => {
                  const next = event.target.value;
                  const container = items[index] ?? {};
                  const cleared: Record<string, unknown> = {};
                  cleared[next] = (container as Record<string, unknown>)[next] ?? {};
                  setPath([...path, index], cleared);
                }}
              >
                {options.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.documentation?.label ?? option.name}
                  </option>
                ))}
              </select>

              {selected &&
                options
                  .filter((option) => option.name === selected)
                  .map((option) => renderField(option, [...path, index, option.name]))}

              <div className="flex justify-end">
                <div className="flex items-center gap-2">
                  <button
                    className="h-8 rounded-xl border px-3 text-sm"
                    onClick={() => {
                      if (index <= 0) return;
                      const next = items.slice();
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      setPath(path, next);
                    }}
                  >
                    ▲
                  </button>
                  <button
                    className="h-8 rounded-xl border px-3 text-sm"
                    onClick={() => {
                      if (index >= items.length - 1) return;
                      const next = items.slice();
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      setPath(path, next);
                    }}
                  >
                    ▼
                  </button>
                  <button
                    className="h-8 rounded-xl border px-3 text-sm"
                    onClick={() => delPath([...path, index])}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button
          className="h-8 rounded-xl border px-3 text-sm"
          onClick={() => {
            if (!Array.isArray(rawValue)) {
              setPath(path, []);
            }
            const defaultName = options[0]?.name ?? "variant";
            setPath([...path, Array.isArray(rawValue) ? items.length : 0], { [defaultName]: {} });
          }}
        >
          Добавить
        </button>
      </div>

      <HelpText field={field} />

      {nodeErrors.length > 0 && (
        <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
          {nodeErrors.map((error, index) => (
            <li key={`${thisKey}-err-${index}`}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}


