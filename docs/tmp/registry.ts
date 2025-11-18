import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import DateCalendar from "@/features/forms-renderer/ui-overrides/date-calendar";
import TextareaField from "@/features/forms-renderer/ui-overrides/textarea";
import EnumCombobox from "@/features/forms-renderer/ui-overrides/enum-combobox";
import BlockRow from "@/features/forms-renderer/ui-overrides/block-row";
import { TFileBlock } from "@/features/forms-renderer/ui-overrides/files/TFileBlock";
import { TDocumentBlock } from "@/features/forms-renderer/ui-overrides/documents/TDocumentBlock";

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
  // Если true — компонент применим только к полям со списком (facets.enum / facets.enumOptions)
  requiresEnum?: boolean;
  // Ограничение по refType (например, complexType tFile)
  refTypes?: string[];
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
  {
    id: "enum.combobox",
    title: "Поиск по списку (комбобокс)",
    kind: "field",
    match: { xmlTypes: ["xs:string"], isBlock: false, requiresEnum: true },
    Render: (props) => React.createElement(EnumCombobox, props),
  },
  // ===== Блочные лэйауты (ряд колонок) =====
  {
    id: "block.row-auto",
    title: "Колонки (авто)",
    kind: "block",
    match: { isBlock: true },
    Render: (props: any) => React.createElement(BlockRow, { ...props, labelLines: 2 }),
  },
  {
    id: "block.row-1",
    title: "Колонки (1)",
    kind: "block",
    match: { isBlock: true },
    Render: (props: any) => React.createElement(BlockRow, { ...props, fixedCols: 1, labelLines: 2 }),
  },
  {
    id: "block.row-2",
    title: "Колонки (2)",
    kind: "block",
    match: { isBlock: true },
    Render: (props: any) => React.createElement(BlockRow, { ...props, fixedCols: 2, labelLines: 2 }),
  },
  {
    id: "block.row-3",
    title: "Колонки (3)",
    kind: "block",
    match: { isBlock: true },
    Render: (props: any) => React.createElement(BlockRow, { ...props, fixedCols: 3, labelLines: 2 }),
  },
  {
    id: "block.row-4",
    title: "Колонки (4)",
    kind: "block",
    match: { isBlock: true },
    Render: (props: any) => React.createElement(BlockRow, { ...props, fixedCols: 4, labelLines: 2 }),
  },
  // ===== Файлы / сложные блоки =====
  {
    id: "files.tfile-card",
    title: "Файл: карточка выбора",
    kind: "block",
    match: { isBlock: true, refTypes: ["tFile"] },
    Render: (props: any) => React.createElement(TFileBlock, props),
  },
  {
    id: "documents.tdocument-card",
    title: "Документ: карточка",
    kind: "block",
    match: { isBlock: true, refTypes: ["tDocument"] },
    Render: (props: any) => React.createElement(TDocumentBlock, props),
  },
];

// ---------- Утилиты сопоставления ----------

export function fieldXmlType(f: FieldModel): string | undefined {
  // В ваших моделях тип примитива хранится как f.dtype (например "xs:string", "xs:date").
  // Если в схеме где-то иначе — подправим тут центрально.
  return (f as any)?.dtype ?? (f as any)?.type ?? undefined;
}

export function canUseComponent(meta: UiComponentMeta, args: { f: FieldModel; isBlock: boolean }) {
  const match = (meta as any)?.match ?? {};
  const isBlockRule = typeof match.isBlock === "boolean" ? match.isBlock : undefined;
  if (typeof isBlockRule === "boolean" && isBlockRule !== args.isBlock) return false;

  const t = args.f?.dtype;
  const xmlTypes: unknown = (match as any).xmlTypes;
  if (Array.isArray(xmlTypes) && xmlTypes.length > 0) {
    if (!t) return false;
    if (!xmlTypes.includes(t)) return false;
  }

  const refTypes: unknown = (match as any).refTypes;
  if (Array.isArray(refTypes) && refTypes.length > 0) {
    const ref = (args.f as any)?.refType;
    if (!ref || !refTypes.includes(String(ref))) return false;
  }

  if ((match as any).requiresEnum) {
    const enumOptsLen = (args.f as any)?.facets?.enumOptions?.length ?? 0;
    const enumLen = (args.f as any)?.facets?.enum?.length ?? 0;
    const hasEnum = (enumOptsLen > 0) || (enumLen > 0);
    if (!hasEnum) return false;
  }
  return true;
}

export function firstAllowedComponentFor(f: FieldModel, isBlock: boolean): UiComponentMeta | null {
  for (const m of UI_COMPONENTS) {
    if (canUseComponent(m, { f, isBlock })) return m;
  }
  return null;
}


