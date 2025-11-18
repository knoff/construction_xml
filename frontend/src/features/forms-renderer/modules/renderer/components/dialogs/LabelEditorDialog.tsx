import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type LabelEditorDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  pathKey: string | null;
  original: string | null;
  current?: string | null;
  onSave: (value: string | undefined) => void;
};

export function LabelEditorDialog({
  open,
  onOpenChange,
  pathKey,
  original,
  current,
  onSave,
}: LabelEditorDialogProps) {
  const [value, setValue] = React.useState<string>("");

  React.useEffect(() => {
    setValue(current ?? "");
  }, [current, open]);

  const showOriginal = original ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактирование подписи поля</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-zinc-500">Путь:</span>{" "}
              <code className="text-xs">{pathKey ?? "—"}</code>
            </div>

            <div>
              <div className="text-zinc-500">Исходный текст</div>
              <div className="rounded border px-2 py-1 bg-zinc-50">{showOriginal}</div>
            </div>

            <div>
              <div className="text-zinc-500">Замещающий текст</div>
              <input
                type="text"
                className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm"
                value={value}
                placeholder="Оставьте пустым, чтобы использовать исходный текст"
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Отмена</Button>
          </DialogClose>
          <Button
            onClick={() => {
              const trimmed = value.trim();
              onSave(trimmed === "" ? undefined : trimmed);
              onOpenChange(false);
            }}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

