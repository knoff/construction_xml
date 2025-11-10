import * as React from "react";
import type { FieldModel } from "../../types";
import { getAtPath } from "@/features/forms/utils/path";
import { FieldLabel } from "../components/FieldLabel";
import { SimpleInput } from "../components/inputs/SimpleInput";
import { HelpText } from "../components/HelpText";

type ScalarArrayProps = {
  field: FieldModel;
  path: (string | number)[];
  state: unknown;
  setPath: (path: (string | number)[], value: unknown) => void;
  delPath: (path: (string | number)[]) => void;
  hasSubtreeErrors: boolean;
  nodeErrors: string[];
};

export function ScalarArray({
  field,
  path,
  state,
  setPath,
  delPath,
  hasSubtreeErrors,
  nodeErrors,
}: ScalarArrayProps) {
  const rawValue = getAtPath(state, path);
  const items = Array.isArray(rawValue) ? rawValue : [];
  const missingRequired = (field.minOccurs ?? 1) > 0 && items.length === 0;

  React.useEffect(() => {
    if (rawValue != null && !Array.isArray(rawValue)) {
      setPath(path, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(rawValue)]);

  const frameClass = hasSubtreeErrors ? "border border-red-500 rounded-xl p-3" : "";

  return (
    <div className={`space-y-2 ${frameClass}`}>
      <FieldLabel field={field} path={path} />
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1">
              <SimpleInput
                field={field}
                path={path}
                value={item}
                onChange={(next) => setPath([...path, index], next)}
              />
            </div>
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
              <button className="h-8 rounded-xl border px-3 text-sm" onClick={() => delPath([...path, index])}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        <button
          className="h-8 rounded-xl border px-3 text-sm"
          onClick={() => {
            if (!Array.isArray(rawValue)) {
              setPath(path, []);
            }
            setPath([...path, Array.isArray(rawValue) ? items.length : 0], "");
          }}
        >
          Добавить
        </button>
      </div>
      <HelpText field={field} />
      {missingRequired && <div className="text-xs text-red-600">Нужно добавить хотя бы один элемент</div>}
      {nodeErrors.length > 0 && (
        <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
          {nodeErrors.map((error, index) => (
            <li key={`${index}-${String(error)}`}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

