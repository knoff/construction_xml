import * as React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";

type Props = {
  onUp?: () => void;
  onDown?: () => void;
  onRemove?: () => void;
  disabledUp?: boolean;
  disabledDown?: boolean;
};

export function ReorderRow({ onUp, onDown, onRemove, disabledUp, disabledDown }: Props) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" type="button" aria-label="Move up" onClick={onUp} disabled={disabledUp}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" type="button" aria-label="Move down" onClick={onDown} disabled={disabledDown}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" type="button" aria-label="Remove" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
