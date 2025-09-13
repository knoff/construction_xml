import React from "react";

export type ExtensionScope = "field" | "group";

export type ExtensionComponentProps = {
  schemaId: number;
  path: string;                 // ключ элемента формы (наш pathKey)
  scope: ExtensionScope;
  // доступ к данным/ошибкам/метаданным, если нужно
  state?: unknown;              // сюда можно прокинуть state формы, если потребуется
  config?: Record<string, any>; // конфиг из привязки (кастомные параметры)
  children?: React.ReactNode;   // дефолтный UI для обёртки/композиции
};

export type ExtensionDef = {
  key: string;                  // уникальный ключ в реестре
  title: string;                // человекочитаемое имя
  scope: ExtensionScope;
  Component: React.ComponentType<ExtensionComponentProps>;
};

export type ExtensionBinding = {
  path: string;
  scope: ExtensionScope;
  extension: string;            // key из реестра
  config?: Record<string, any>;
};

export type ExtensionsMappingResponse = {
  bindings: ExtensionBinding[];
};
