import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import { getAtPath, pathKey, normalizePathKey } from "@/features/forms-renderer/core/utils/path";
import { countSubtreeErrors, hasAnyValidatorErrors } from "@/features/forms-renderer/core/utils/errors";
import { useUiOverrides } from "@/features/documents";
import { UI_COMPONENTS, canUseComponent } from "@/features/forms-renderer/modules/ui-overrides/runtime/registry";
import { BlockFrame } from "../BlockFrame";
import { HelpText } from "../HelpText";
import { shallowMissingForField } from "../../core/field-utils";

type RenderFieldFn = (field: FieldModel, path: (string | number)[]) => React.ReactNode;

type ComplexSingleProps = {
  field: FieldModel;
  path: (string | number)[];
  state: unknown;
  setPath: (path: (string | number)[], value: unknown) => void;
  delPath: (path: (string | number)[]) => void;
  renderField: RenderFieldFn;
  errors?: Record<string, string[]>;
  isBlock: boolean;
};

export function ComplexSingle({
  field,
  path,
  state,
  setPath,
  delPath,
  renderField,
  errors,
  isBlock,
}: ComplexSingleProps) {
  const thisKey = pathKey(path);
  const nodeErrors = errors?.[thisKey] ?? [];
  const nodeValue = getAtPath(state, path);
  const subtreeMeta = React.useMemo(() => countSubtreeErrors(errors ?? {}, thisKey), [errors, thisKey]);

  const ui = useUiOverrides();
  const normalizedPath = normalizePathKey(thisKey);
  const manualUi = ui.overrides?.widgets?.[normalizedPath];
  const manualMeta = manualUi ? UI_COMPONENTS.find((meta) => meta.id === manualUi) ?? null : null;

  const children = field.children ?? [];
  const attributes = field.attributes ?? [];

  const renderChildren = React.useCallback(() => {
    const elements = [
      ...children.map((child) => renderField(child, [...path, child.name])),
      ...attributes.map((attr) => renderField(attr, [...path, `@${attr.name}`])),
    ];

    if (manualMeta && canUseComponent(manualMeta, { f: field, isBlock: true })) {
      const Component = manualMeta.Render as React.FC<{
        f: FieldModel;
        path: (string | number)[];
        childrenFields: FieldModel[];
        renderChild: (child: FieldModel, childPath: (string | number)[]) => React.ReactNode;
      }>;

      return (
        <Component
          f={field}
          path={path}
          childrenFields={children as FieldModel[]}
          renderChild={(child, _childPath) => renderField(child, [...path, child.name])}
        />
      );
    }

    return <>{elements}</>;
  }, [attributes, children, field, manualMeta, path, renderField]);

  const synthetic = React.useMemo(() => {
    const container = (nodeValue ?? {}) as Record<string, unknown>;
    const messages: string[] = [];
    let count = 0;

    for (const child of children as FieldModel[]) {
      const childPath = [...path, child.name];
      const valueAtChild = container?.[child.name];
      if (!hasAnyValidatorErrors(errors, childPath) && shallowMissingForField(child, valueAtChild)) {
        count += 1;
        if (messages.length < 3) messages.push("Поле обязательно");
      }
    }

    for (const attr of attributes as FieldModel[]) {
      const attrPath = [...path, `@${attr.name}`];
      const valueAtAttr = container?.[`@${attr.name}`];
      if (!hasAnyValidatorErrors(errors, attrPath) && shallowMissingForField(attr, valueAtAttr)) {
        count += 1;
        if (messages.length < 3) messages.push("Поле обязательно");
      }
    }

    return { count, messages };
  }, [attributes, children, errors, nodeValue, path]);

  const hasError = subtreeMeta.count > 0 || synthetic.count > 0;
  const errPreview = React.useMemo(
    () => Array.from(new Set([...subtreeMeta.preview, ...synthetic.messages])).slice(0, 3),
    [subtreeMeta.preview, synthetic.messages],
  );

  if ((field.minOccurs ?? 1) === 0 && nodeValue == null) {
    return (
      <BlockFrame field={field} path={path} isBlock={isBlock}>
        <div className="text-xs text-zinc-500">
          Этот раздел необязателен. Нажмите «Добавить», чтобы заполнить.
        </div>
        <div>
          <button className="h-8 rounded-xl border px-3 text-sm" onClick={() => setPath(path, {})}>
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
      </BlockFrame>
    );
  }

  return (
    <BlockFrame
      field={field}
      path={path}
      isBlock={isBlock}
      hasError={hasError}
      errsHere={nodeErrors}
      errCount={subtreeMeta.count + synthetic.count}
      errPreview={errPreview}
    >
      {renderChildren()}
      {(field.minOccurs ?? 1) === 0 && (
        <div className="flex justify-end">
          <button className="h-8 rounded-xl border px-3 text-sm" onClick={() => delPath(path)}>
            Удалить раздел
          </button>
        </div>
      )}
      <HelpText field={field} />
    </BlockFrame>
  );
}



