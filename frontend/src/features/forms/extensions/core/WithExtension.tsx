import React from "react";
import { useExtensionsMapping } from "./context";
import { getExtension } from "./registry";
import type { ExtensionScope, ExtensionComponentProps } from "./types";

type Props = {
  schemaId: number;
  scope: ExtensionScope;
  path: string;
  state?: unknown;
  children: React.ReactNode;        // дефолтный UI
};

export default function WithExtension({ schemaId, scope, path, state, children }: Props) {
  const { getBinding } = useExtensionsMapping();
  const binding = getBinding(path, scope);

  if (!binding) return <>{children}</>;

  const def = getExtension(binding.extension);
  if (!def) {
    console.warn("[extensions] not found in registry:", binding.extension);
    return <>{children}</>;
  }

  const Comp = def.Component;
  const props: ExtensionComponentProps = { schemaId, scope, path, state, config: binding.config, children };

  // стратегия: сначала попробовать заменить полностью, а если расширение — «обёртка», оно использует children
  return <Comp {...props} />;
}
