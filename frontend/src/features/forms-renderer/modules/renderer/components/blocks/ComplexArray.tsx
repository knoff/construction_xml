import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import { getAtPath, pathKey, normalizePathKey } from "@/features/forms-renderer/core/utils/path";
import { countSubtreeErrors, hasAnyValidatorErrors } from "@/features/forms-renderer/core/utils/errors";
import { BlockFrame } from "../BlockFrame";
import { HelpText } from "../HelpText";
import { useUiOverrides } from "@/features/documents";
import { UI_COMPONENTS, canUseComponent } from "@/features/forms-renderer/modules/ui-overrides/runtime/registry";
import { shallowMissingForField } from "../../core/field-utils";
import { ValueLinkQuickCheck } from "@/features/forms-renderer/modules/ui-overrides/components";

type RenderFieldFn = (field: FieldModel, path: (string | number)[]) => React.ReactNode;

type ComplexArrayProps = {
  field: FieldModel;
  path: (string | number)[];
  state: unknown;
  setPath: (path: (string | number)[], value: unknown) => void;
  delPath: (path: (string | number)[]) => void;
  renderField: RenderFieldFn;
  errors?: Record<string, string[]>;
  isBlock: boolean;
};

export function ComplexArray({
  field,
  path,
  state,
  setPath,
  delPath,
  renderField,
  errors,
  isBlock,
}: ComplexArrayProps) {
  const thisKey = pathKey(path);
  const ui = useUiOverrides();
  const nodeErrors = errors?.[thisKey] ?? [];
  const rawValue = getAtPath(state, path);
  const items = Array.isArray(rawValue) ? rawValue : [];

  React.useEffect(() => {
    if (rawValue != null && !Array.isArray(rawValue)) {
      setPath(path, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(rawValue)]);

  const children = field.children ?? [];
  const attributes = field.attributes ?? [];

  const subtreeMeta = React.useMemo(
    () => countSubtreeErrors(errors ?? {}, thisKey),
    [errors, thisKey],
  );

  const synthetic = React.useMemo(() => {
    let count = 0;
    const messages: string[] = [];

    items.forEach((_, index) => {
      const container = (rawValue ?? [])[index] ?? {};

      for (const child of children as FieldModel[]) {
        const childValue = (container as Record<string, unknown>)[child.name];
        const childPath = [...path, index, child.name];
        if (!hasAnyValidatorErrors(errors, childPath) && shallowMissingForField(child, childValue)) {
          count += 1;
          if (messages.length < 3) messages.push("Поле обязательно");
        }
      }

      for (const attr of attributes as FieldModel[]) {
        const attrValue = (container as Record<string, unknown>)[`@${attr.name}`];
        const attrPath = [...path, index, `@${attr.name}`];
        if (!hasAnyValidatorErrors(errors, attrPath) && shallowMissingForField(attr, attrValue)) {
          count += 1;
          if (messages.length < 3) messages.push("Поле обязательно");
        }
      }
    });

    return { count, messages };
  }, [attributes, children, errors, items, path, rawValue]);

  const hasError = subtreeMeta.count > 0 || synthetic.count > 0;
  const errPreview = React.useMemo(
    () => Array.from(new Set([...subtreeMeta.preview, ...synthetic.messages])).slice(0, 3),
    [subtreeMeta.preview, synthetic.messages],
  );

  return (
    <BlockFrame
      field={field}
      path={path}
      isBlock={isBlock}
      headerExtra={
        <button
          className="h-8 rounded-xl border px-3 text-sm"
          onClick={() => {
            if (!Array.isArray(rawValue)) {
              setPath(path, []);
            }
            setPath([...path, Array.isArray(rawValue) ? items.length : 0], {});
          }}
        >
          Добавить
        </button>
      }
      hasError={hasError}
      errsHere={nodeErrors}
      errCount={subtreeMeta.count + synthetic.count}
      errPreview={errPreview}
      headerStatus={
        <ValueLinkQuickCheck
          path={path}
          value={items}
          label="Статус сопоставления раздела"
          variant="inline"
        />
      }
    >
      {items.map((_, index) => {
        const itemPath = [...path, index];
        const itemKey = normalizePathKey(pathKey(itemPath));
        const containerKey = normalizePathKey(thisKey);

        const manualUi =
          (ui.overrides?.widgets?.[itemKey] as string | undefined) ??
          (ui.overrides?.widgets?.[containerKey] as string | undefined);

        const manualMeta = manualUi ? UI_COMPONENTS.find((meta) => meta.id === manualUi) ?? null : null;

        const defaultChildren = (
          <>
            {children.map((child) => renderField(child, [...path, index, child.name]))}
            {attributes.map((attr) => renderField(attr, [...path, index, `@${attr.name}`]))}
          </>
        );

        const renderedChildren =
          manualMeta && canUseComponent(manualMeta, { f: field, isBlock: true })
            ? (() => {
                const Component = manualMeta.Render as unknown as React.FC<{
                  f: FieldModel;
                  path: (string | number)[];
                  childrenFields: FieldModel[];
                  renderChild: (child: FieldModel, nextPath: (string | number)[]) => React.ReactNode;
                }>;

                return (
                  <Component
                    f={field}
                    path={itemPath}
                    childrenFields={children as FieldModel[]}
                    renderChild={(child, _childPath) =>
                      renderField(child, [...path, index, child.name])
                    }
                  />
                );
              })()
            : defaultChildren;

        return (
          <div key={index} className="rounded-xl border p-3 space-y-3 bg-white">
            <div className="flex justify-end">
              <ValueLinkQuickCheck
                path={itemPath}
                value={items[index]}
                label={`Сопоставление элемента ${index + 1}`}
                variant="inline"
              />
            </div>
            {renderedChildren}
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
                <button className="h-8 rounded-xl border px-3 text-sm" onClick={() => delPath(itemPath)}>
                  Удалить
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <HelpText field={field} />
    </BlockFrame>
  );
}



