import type { ComponentType } from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";

export type UiKind = "field" | "block";

export type UiComponentProps = {
  f: FieldModel;
  path: (string | number)[];
  value: unknown;
  setValue: (value: unknown) => void;
  clearValue?: () => void;
};

export type UiMatchRule = {
  /** Разрешённые XSD-типы для полей (например, ["xs:date"]) */
  xmlTypes?: string[];
  /** Использование только для блоков или только для полей */
  isBlock?: boolean;
  /** Компонент применим только при наличии enum-значений */
  requiresEnum?: boolean;
  /** Ограничение по refType (например, complexType tFile) */
  refTypes?: string[];
};

export type UiComponentMeta = {
  /** Стабильный идентификатор компонента, сохраняемый в БД */
  id: string;
  /** Человекочитаемое имя */
  title: string;
  /** Тип компонента (поле или блок) */
  kind: UiKind;
  /** Правила сопоставления */
  match: UiMatchRule;
  /** Реализация отображения */
  Render: ComponentType<any>;
};
