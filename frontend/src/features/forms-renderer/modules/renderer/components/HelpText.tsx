import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";

export function HelpText({ field }: { field: FieldModel }) {
  const help = field.documentation?.help;
  return help ? <div className="text-xs text-zinc-500 mt-1">{help}</div> : null;
}

