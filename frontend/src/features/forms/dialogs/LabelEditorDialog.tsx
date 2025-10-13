import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  setLabel: (v: string) => void;
};

export function LabelEditorDialog({ open, onOpenChange, label, setLabel }: Props) {
  const [buf, setBuf] = React.useState(label ?? "");
  React.useEffect(() => setBuf(label ?? ""), [label]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Переименовать метку</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <input className="border rounded px-2 py-1" value={buf} onChange={(e) => setBuf(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="secondary">Отмена</Button>
          </DialogClose>
          <Button onClick={() => { setLabel(buf); onOpenChange(false); }}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
