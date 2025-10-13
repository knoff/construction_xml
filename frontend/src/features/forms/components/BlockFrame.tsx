import * as React from "react";
import type { FieldModel } from "../types";
import { cn } from "@/lib/utils";

export type BlockFrameProps = {
  f: FieldModel;
  title: React.ReactNode;
  badges?: React.ReactNode;
  errorCount?: number;
  errorPreview?: string[];
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
};

export function BlockFrame({ title, badges, errorCount, errorPreview, collapsed, onToggle, children }: BlockFrameProps) {
  return (
    <div className={cn("rounded-xl border p-3", errorCount ? "border-red-400" : "border-muted")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" className="font-medium" onClick={onToggle} aria-expanded={!collapsed}>
            {title}
          </button>
          {badges}
        </div>
        {errorCount ? (
          <div className="text-xs text-red-600">
            {errorCount} ошибка(и){errorPreview?.length ? `: ${errorPreview.join("; ")}` : ""}
          </div>
        ) : null}
      </div>
      {!collapsed && <div className="mt-3">{children}</div>}
    </div>
  );
}
