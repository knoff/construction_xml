import * as React from "react";
import type { FieldModel } from "../types";
import { pathKey } from "@/features/forms/utils/path";
import { useUiMetaForPath } from "@/features/forms/hooks/useUiMeta";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UI_COMPONENTS } from "@/features/forms/ui/registry";

export function UiOverrideBadge({ f, path, isBlock }: { f: FieldModel; path: (string | number)[]; isBlock: boolean }) {
  const { manualId, setManual } = useUiMetaForPath(f, path, { isBlock });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="xs" type="button" aria-label="UI override">
          UI{manualId ? `: ${manualId}` : ""}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 overflow-auto">
        {manualId && <DropdownMenuItem onClick={() => setManual(undefined)}>Сбросить</DropdownMenuItem>}
        {manualId && <DropdownMenuSeparator />}
        {UI_COMPONENTS.map((cmp) => (
          <DropdownMenuItem key={cmp.id} onClick={() => setManual(cmp.id)}>
            {cmp.id}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
