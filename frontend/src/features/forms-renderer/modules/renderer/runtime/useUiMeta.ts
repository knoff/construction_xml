import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import { useUiOverrides } from "@/features/documents/context";
import { normalizePathKey, pathKey } from "@/features/forms-renderer/core/utils/path";
import { UI_COMPONENTS, canUseComponent, firstAllowedComponentFor } from "@/features/forms-renderer/modules/ui-overrides/runtime/registry";

type Ctx = { isBlock: boolean };

export function useUiMetaForPath(f: FieldModel, path: (string | number)[], ctx: Ctx) {
  const ui = useUiOverrides();
  const npk = normalizePathKey(pathKey(path));

  const manualId = ui.overrides?.widgets?.[npk];
  const manual = manualId ? UI_COMPONENTS.find((x) => x.id === manualId) : undefined;

  const fallback = React.useMemo(
    () => firstAllowedComponentFor(f, { isBlock: ctx.isBlock }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f, ctx.isBlock]
  );

  const chosen = manual && canUseComponent(manual, { f, isBlock: ctx.isBlock }) ? manual : fallback;

  const setManual = React.useCallback(
    (id?: string) => {
      ui.updateWidgets((prev) => {
        const next = { ...(prev ?? {}) } as Record<string, string>;
        if (!id) delete next[npk];
        else next[npk] = id;
        return next;
      });
    },
    [npk, ui]
  );

  return { chosen, manualId, setManual };
}


