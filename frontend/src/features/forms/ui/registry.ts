import * as React from "react";
import type { FieldModel } from "@/features/forms/types"; // путь подкорректируйте по репо
import DateCalendar from "@/features/forms/ui/date-calendar";
import TextareaField from "@/features/forms/ui/textarea";

export type UiKind = "field" | "block";

export type UiComponentProps = {
  f: FieldModel;
  path: (string|number)[];
  value: unknown;
  setValue: (v: unknown) => void;
  clearValue?: () => void;
};

export type UiMatchRule = {
  // Разрешённые XSD-типы (для простых полей): например ["xs:date"]
  xmlTypes?: string[];

  // Разрешать/запрещать на блоках:
  //  - если true: показывать только для isBlock
  //  - если false: показывать только для НЕ-блоков
  //  - если undefined: не учитывать
  isBlock?: boolean;
};

export type UiComponentMeta = {
  id: string;          // стабильный ID для хранения в БД
  title: string;       // человекочитаемое имя
  kind: UiKind;        // "field" | "block"
  match: UiMatchRule;  // правила применения
  Render: React.FC<UiComponentProps>;
};

// ---------- Реестр компонентов ----------
export const UI_COMPONENTS: UiComponentMeta[] = [
  {
    id: "date.calendar",
    title: "Календарь (дата)",
    kind: "field",
    match: { xmlTypes: ["xs:date"], isBlock: false },
    Render: DateCalendar,
  },
  {
    id: "text.textarea",
    title: "Многострочный ввод (textarea)",
    kind: "field",
    match: { xmlTypes: ["xs:string"], isBlock: false },
    Render: TextareaField,
  },
  // сюда позже добавим «файлы», «автор», кастомные блоки и т.д.
];

// ---------- Утилиты сопоставления ----------

export function fieldXmlType(f: FieldModel): string | undefined {
  // В ваших моделях тип примитива хранится как f.dtype (например "xs:string", "xs:date").
  // Если в схеме где-то иначе — подправим тут центрально.
  return (f as any)?.dtype ?? (f as any)?.type ?? undefined;
}

export function canUseComponent(meta: UiComponentMeta, args: { f: FieldModel; isBlock: boolean }): boolean {
  const t = fieldXmlType(args.f);
  if (typeof meta.match.isBlock === "boolean" && meta.match.isBlock !== args.isBlock) return false;
  if (meta.match.xmlTypes && meta.match.xmlTypes.length > 0) {
    if (!t) return false;
    if (!meta.match.xmlTypes.includes(t)) return false;
  }
  return true;
}

export function firstAllowedComponentFor(f: FieldModel, isBlock: boolean): UiComponentMeta | null {
  for (const m of UI_COMPONENTS) {
    if (canUseComponent(m, { f, isBlock })) return m;
  }
  return null;
}
