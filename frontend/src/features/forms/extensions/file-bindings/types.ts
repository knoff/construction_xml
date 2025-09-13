export type FileBinding = {
  path?: string;
  rootPath?: string;
  kind: "file" | "container";
  id?: number | string;          // часто так
  bindingId?: number | string;   // или так
  pk?: number | string;          // на всякий случай
  meta?: any;
  [k: string]: any;              // не жёстко типизируем остальные поля
};
export type FileBindingsPayload = { bindings: FileBinding[] };
