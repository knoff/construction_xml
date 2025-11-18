import * as React from "react";
import type { UiComponentProps } from "../../core/types";

export const TextareaField: React.FC<UiComponentProps> = ({ value, setValue }) => {
  return (
    <textarea
      className="min-h-[96px] w-full rounded-[var(--radius)] border px-3 py-2 text-sm"
      value={(value ?? "") as string}
      onChange={(e)=> setValue(e.target.value)}
    />
  );
};
