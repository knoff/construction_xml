import * as React from "react";
import type { FieldModel } from "../../types";
import { pathKey } from "@/features/forms/utils/path";
import { FieldLabel } from "../components/FieldLabel";
import { HelpText } from "../components/HelpText";
import { clearContainerForSelect, readChoiceContainer } from "../utils";

type RenderFieldFn = (field: FieldModel, nextPath: (string | number)[]) => React.ReactNode;

type SingleChoiceProps = {
  field: FieldModel;
  path: (string | number)[];
  state: unknown;
  setPath: (path: (string | number)[], value: unknown) => void;
  renderField: RenderFieldFn;
  errors?: Record<string, string[]>;
};

export function SingleChoice({
  field,
  path,
  state,
  setPath,
  renderField,
  errors,
}: SingleChoiceProps) {
  const options = React.useMemo(
    () => (field.children ?? []).filter((child) => child.kind !== "attribute"),
    [field.children],
  );

  const container = (readChoiceContainer(state, path, field, options as any) ?? {}) as Record<
    string,
    unknown
  >;

  const sequenceOption = options.find((option) => option.kind === "sequence") as FieldModel | undefined;

  const selected = React.useMemo(() => {
    for (const option of options.filter((opt) => opt.kind !== "sequence")) {
      if (Object.prototype.hasOwnProperty.call(container, option.name)) {
        return option.name;
      }
    }

    if (
      sequenceOption?.children?.some((child) =>
        Object.prototype.hasOwnProperty.call(container, child.name),
      )
    ) {
      return "__sequence__";
    }

    return options[0]?.name ?? null;
  }, [container, options, sequenceOption]);

  const thisKey = pathKey(path);
  const nodeErrors = errors?.[thisKey] ?? [];

  const handleSelectChange = React.useCallback(
    (nextName: string | null) => {
      const cleared = clearContainerForSelect(container, options as any, nextName ?? "");
      if (nextName && nextName !== "__sequence__") {
        (cleared as Record<string, unknown>)[nextName] = (cleared as Record<string, unknown>)[
          nextName
        ] ?? {};
      }
      setPath(path, cleared);
    },
    [container, options, path, setPath],
  );

  return (
    <div className="space-y-2">
      <FieldLabel
        field={{ ...field, documentation: field.documentation ?? { label: "Вариант" } }}
        path={path}
      />

      <select
        className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
        value={selected ?? ""}
        onChange={(event) => handleSelectChange(event.target.value || null)}
      >
        {options
          .filter((option) => option.kind !== "sequence")
          .map((option) => (
            <option key={option.name} value={option.name}>
              {option.documentation?.label ?? option.name}
            </option>
          ))}
        {sequenceOption && (
          <option value="__sequence__">{sequenceOption.documentation?.label ?? "Группа полей"}</option>
        )}
      </select>

      <div className="rounded-xl border p-3 space-y-3">
        {selected === "__sequence__" && sequenceOption
          ? (sequenceOption.children ?? []).map((child) =>
              renderField(child as FieldModel, [...path, child.name]),
            )
          : options
              .filter((option) => option.name === selected)
              .map((option) => renderField(option, [...path, option.name]))}
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

