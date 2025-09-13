import { ExtensionDef } from "./types";

const REGISTRY = new Map<string, ExtensionDef>();

export function registerExtension(def: ExtensionDef) {
  if (REGISTRY.has(def.key)) {
    // тихо перезаписывать нельзя — это ловушка
    // в проде можно заменить на no-op, здесь явно ругаемся
    throw new Error(`[extensions] duplicate key: ${def.key}`);
  }
  REGISTRY.set(def.key, def);
}

export function getExtension(key: string) {
  return REGISTRY.get(key) || null;
}

export function listExtensions(scope?: "field" | "group") {
  const items = Array.from(REGISTRY.values());
  return scope ? items.filter(x => x.scope === scope) : items;
}
