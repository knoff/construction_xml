import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import { pathKey, normalizePathKey } from "@/features/forms-renderer/core/utils/path";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useUiOverrides } from "@/features/documents";
import { UI_COMPONENTS, canUseComponent } from "@/features/forms-renderer/modules/ui-overrides/runtime/registry";

type UiOverrideBadgeProps = {
  field: FieldModel;
  path: (string | number)[];
  kind: "field" | "block";
  onReset?: () => void;
};

export function UiOverrideBadge({ field, path, kind, onReset }: UiOverrideBadgeProps) {
  const ui = useUiOverrides();
  const pk = normalizePathKey(pathKey(path));

  const allowed = React.useMemo(() => {
    const all = Array.isArray(UI_COMPONENTS) ? UI_COMPONENTS : [];
    return all.filter((meta) => {
      try {
        return canUseComponent(meta, { f: field, isBlock: kind === "block" });
      } catch {
        return false;
      }
    });
  }, [field, kind]);

  const current = ui.overrides?.widgets?.[pk];
  const highlighted = Boolean(current);

  const handleSelect = React.useCallback(
    (componentId: string | undefined) => {
      const next = { ...(ui.overrides || {}) };
      next.widgets = { ...(next.widgets || {}) };

      if (!componentId) {
        delete next.widgets?.[pk];
      } else {
        next.widgets![pk] = componentId;
      }

      ui.setOverrides(next);
      ui.markDirty();
      onReset?.();
    },
    [pk, ui, onReset],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`rounded-full border px-2 py-0.5 text-[10px] leading-none ${
            highlighted ? "bg-amber-50 border-amber-300" : "opacity-70 hover:opacity-100"
          }`}
          title={kind === "block" ? "Переопределить UI блока" : "Переопределить UI-компонент"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          UI
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6}>
        {allowed.length === 0 && <DropdownMenuItem disabled>Нет доступных компонентов</DropdownMenuItem>}
        {allowed.map((meta) => (
          <DropdownMenuItem
            key={meta.id}
            onSelect={(event) => {
              event.preventDefault();
              handleSelect(meta.id);
            }}
          >
            <span className="flex-1">{meta.title}</span>
            {current === meta.id ? <span className="text-zinc-500">✓</span> : null}
          </DropdownMenuItem>
        ))}
        {allowed.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            handleSelect(undefined);
          }}
        >
          Сбросить переопределение
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}



