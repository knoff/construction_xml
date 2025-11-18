import * as React from "react";
import { cn } from "@/lib/utils";
import type { FieldModel } from "@/features/forms-renderer/types";
// Экспортируем контекст, чтобы FieldLabel мог прочитать настройки лэйаута.
export const RowLayoutContext = React.createContext<{ labelLines?: 1 | 2 } | null>(null);

type BlockRowProps = React.PropsWithChildren<{
  /** Вариант 1: отдаём готовых детей как JSX через props.children (обёртка). */
  /** Вариант 2: отдаём список полей и коллбэк отрисовки каждого (генератор). */
  childrenFields?: FieldModel[];
  renderChild?: (child: FieldModel, childPath: (string | number)[]) => React.ReactNode;
  /** Необязательно — просто пробрасывается дальше при необходимости. */
  f?: FieldModel;
  path?: (string | number)[];
  /** Фиксированное число колонок: 1..4. Если не задано — авто, но максимум 4. */
  fixedCols?: 1 | 2 | 3 | 4;
  /** Сколько строк текста отводим под подпись Label (1 или 2). По умолчанию 2. */
  labelLines?: 1 | 2;
}>;

/**
 * Универсальный блочный лэйаут: выводит содержимое в одну строку (grid).
 * Поддерживает два способа использования:
 *  - как обёртка: <BlockRow>{children}</BlockRow>
 *  - как генератор: <BlockRow childrenFields=[...] renderChild={...} />
 */
export default function BlockRow(props: BlockRowProps) {
  const hasGenerator = Array.isArray(props.childrenFields) && typeof props.renderChild === "function";

  // Считаем количество элементов безопасно в обоих режимах
  const childrenArray = hasGenerator
    ? (props.childrenFields as FieldModel[])
    : React.Children.toArray(props.children);
  const count = childrenArray ? (childrenArray as any[]).length : 0;

  // Кол-во колонок: фиксированное (1..4) или авто (не больше 4)
  const autoCols = Math.min(Math.max(count || 1, 1), 4);
  const cols = props.fixedCols ? Math.min(Math.max(props.fixedCols, 1), 4) : autoCols;
  const gridCols =
    cols === 4 ? "md:grid-cols-4"
    : cols === 3 ? "md:grid-cols-3"
    : cols === 2 ? "md:grid-cols-2"
    : "md:grid-cols-1";

  // --- DEBUG ---
  try {
    const dbgPath = (props.path ?? []).join(".");
    // для children выведем компактное описание нод
    const dbgChildren =
      hasGenerator
        ? (props.childrenFields as FieldModel[]).map((cf) => cf?.name ?? "(anon)")
        : React.Children.toArray(props.children).map((n: any) => {
            if (!n) return "null";
            if (typeof n === "string") return `"${n}"`;
            const typeName = typeof n.type === "string" ? n.type : (n.type?.name || "Unknown");
            return typeName;
          });
    // eslint-disable-next-line no-console
    console.groupCollapsed(`[BlockRow] path=${dbgPath || "(root)"} mode=${hasGenerator ? "generator" : "children"}`);
    // eslint-disable-next-line no-console
    console.log({ count, fixedCols: props.fixedCols ?? null, cols, gridCols, childrenSample: dbgChildren });
    // eslint-disable-next-line no-console
    console.groupEnd();
  } catch { /* ignore */ }

  return (
    <RowLayoutContext.Provider value={{ labelLines: props.labelLines ?? 2 }}>
      <div className={cn("grid gap-3 grid-cols-1", gridCols)}>
        {hasGenerator
          ? (props.childrenFields as FieldModel[]).map((cf, idx) => (
              <div key={cf?.name ?? idx} className="min-w-0">
                {props.renderChild!(cf, [...(props.path ?? []), cf?.name ?? idx])}
              </div>
            ))
          : React.Children.toArray(props.children).map((child, i) => (
              <div key={i} className="min-w-0">{child}</div>
            ))}
      </div>
    </RowLayoutContext.Provider>
  );
}
