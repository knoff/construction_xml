import * as React from "react";
import type { FieldModel } from "@/features/forms/types";
import BlockRow from "@/features/forms/ui/block-row";
import { useFormStateController } from "@/features/forms/Renderer/contexts";
import { getAtPath } from "@/features/forms/utils/path";
import { ValueLinkQuickCheck } from "@/features/forms/ui/components/ValueLinkStatus";

const CHOICE_FIELD_FALLBACK = "__choice__";

export type TDocumentBlockProps = {
  path: (string | number)[];
  childrenFields: FieldModel[];
  renderChild: (child: FieldModel, childPath: (string | number)[]) => React.ReactNode;
};

export function TDocumentBlock(props: TDocumentBlockProps) {
  const { path, childrenFields, renderChild } = props;
  const { state } = useFormStateController<any>();

  // Список полей метаданных документа: исключаем сам choice и его техническое имя.
  const metaFields = React.useMemo(
    () =>
      childrenFields.filter(
        (child) => child && child.kind !== "choice" && child.name !== CHOICE_FIELD_FALLBACK,
      ),
    [childrenFields],
  );

  // Сам узел выбора (например, File / Included / Link) берём без дополнительной логики.
  const choiceField = React.useMemo(
    () =>
      childrenFields.find((child) => child?.kind === "choice" || child?.name === CHOICE_FIELD_FALLBACK) ?? null,
    [childrenFields],
  );

  // Готовим путь до choice-узла; используем имя из схемы или стандартный fallback.
  const choicePath = React.useMemo(
    () => [...path, choiceField?.name ?? CHOICE_FIELD_FALLBACK],
    [path, choiceField?.name],
  );

  const docName = getString(state, [...path, "DocName"]);
  const docTypeValue = getString(state, [...path, "DocType"]);
  const docNumber = getString(state, [...path, "DocNumber"]);
  const docDate = getString(state, [...path, "DocDate"]);
  const docAuthor = getString(state, [...path, "DocIssueAuthor"]);
  const docNumberPath = React.useMemo<(string | number)[]>(() => [...path, "DocNumber"], [path]);
  const docDatePath = React.useMemo<(string | number)[]>(() => [...path, "DocDate"], [path]);
  const docAuthorPath = React.useMemo<(string | number)[]>(() => [...path, "DocIssueAuthor"], [path]);
  const quickChecks = React.useMemo(
    () => {
      const items: { id: string; label: string; path: (string | number)[]; value: unknown }[] = [];
      if (docNumber) items.push({ id: "DocNumber", label: "Совпадение номера", path: docNumberPath, value: docNumber });
      if (docDate) items.push({ id: "DocDate", label: "Совпадение даты", path: docDatePath, value: docDate });
      if (docAuthor) items.push({ id: "DocIssueAuthor", label: "Совпадение автора", path: docAuthorPath, value: docAuthor });
      return items;
    },
    [docAuthor, docAuthorPath, docDate, docDatePath, docNumber, docNumberPath],
  );
  const docChangesField = React.useMemo(
    () => metaFields.find((field) => field?.name === "DocChanges") ?? null,
    [metaFields],
  );
  const primaryMetaFields = React.useMemo(
    () => metaFields.filter((field) => field?.name !== "DocChanges"),
    [metaFields],
  );

  // Отображаем человекочитаемое название типа документа (если есть в enum-значениях).
  const docTypeLabel = React.useMemo(() => {
    const typeField = metaFields.find((field) => field?.name === "DocType");
    const options = (typeField?.facets as any)?.enumOptions as { value: string; label?: string }[] | undefined;
    const match = options?.find((item) => item.value === docTypeValue);
    return match?.label ?? docTypeValue ?? "Тип документа не выбран";
  }, [docTypeValue, metaFields]);

  // Строка краткого описания документа (номер, дата, автор).
  const summaryLine = React.useMemo(() => {
    const parts: string[] = [];
    if (docNumber) parts.push(`№ ${docNumber}`);
    if (docDate) parts.push(`от ${docDate}`);
    if (docAuthor) parts.push(docAuthor);
    return parts.join(" · ");
  }, [docAuthor, docDate, docNumber]);

  // Результат стандартного рендера choice-блока (SingleChoice). Будем делить его на части.
  const renderedChoice = React.useMemo(() => {
    if (!choiceField) return null;
    return renderChild(choiceField, choicePath);
  }, [choiceField, choicePath, renderChild]);

  // Разделяем выбор варианта и содержимое выбранного варианта.
  const choiceFragments = React.useMemo(() => {
    if (!renderedChoice || !React.isValidElement(renderedChoice)) {
      return { selector: renderedChoice, content: null as React.ReactNode, tail: null as React.ReactNode };
    }

    const children = React.Children.toArray(renderedChoice.props.children ?? []);
    const selectorChildren = children.slice(0, 2);
    const contentChild = children[2] ?? null;
    const tailChildren = children.slice(3);

    const selector =
      selectorChildren.length > 0
        ? React.cloneElement(renderedChoice, undefined, selectorChildren)
        : null;

    return {
      selector,
      content: contentChild as React.ReactNode,
      tail: tailChildren.length > 0 ? (tailChildren as React.ReactNode[]) : null,
    };
  }, [renderedChoice]);

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      {/* Заголовок карточки документа */}
      <div className="space-y-1 border-b border-zinc-100 pb-3">
        <div className="text-xs uppercase tracking-wide text-zinc-500">{docTypeLabel}</div>
        <div className="text-lg font-semibold text-zinc-900">{docName || "Документ"}</div>
        {summaryLine ? <div className="text-xs text-zinc-500">{summaryLine}</div> : null}
        {quickChecks.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {quickChecks.map((check) => (
              <ValueLinkQuickCheck
                key={check.id}
                path={check.path}
                value={check.value}
                label={check.label}
                variant="inline"
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Основные метаданные в виде сетки */}
      {primaryMetaFields.length > 0 && (
        <BlockRow
          path={path}
          childrenFields={primaryMetaFields}
          renderChild={(child, childPath) => renderChild(child, childPath)}
          fixedCols={2}
        />
      )}

      {/* История изменений документа, если поле присутствует */}
      {docChangesField ? (
        <div>
          {renderChild(docChangesField, [...path, docChangesField.name])}
        </div>
      ) : null}

      {/* Раздельный вывод: сначала UI выбора, затем содержимое выбранного варианта */}
      {choiceField ? (
        <div className="space-y-2">
          {choiceFragments.selector}
          {choiceFragments.content}
          {choiceFragments.tail ? <>{choiceFragments.tail}</> : null}
          {!choiceFragments.selector && !choiceFragments.content ? renderedChoice : null}
        </div>
      ) : null}
    </div>
  );
}

// Утилита для чтения строковых значений с безопасной проверкой.
function getString(state: unknown, path: (string | number)[]): string | undefined {
  const value = getAtPath(state, path);
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}
