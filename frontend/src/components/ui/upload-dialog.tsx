// src/components/ui/upload-dialog.tsx
// Generic upload dialog built on shadcn/ui Dialog
import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // твоя утилита
import { X } from "lucide-react";

type UploadDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  accept?: string;             // e.g. ".xsd,.xsl,.xslt"
  multiple?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  requirements?: React.ReactNode; // block with rules/hints
  primaryLabel?: string;       // default: "Загрузить"
};

export function UploadDialog({
  open, onOpenChange, title = "Загрузка файла",
  accept = "", multiple = false, onUpload,
  requirements, primaryLabel = "Загрузить",
}: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleUpload() {
    if (!files.length) return;
    setBusy(true);
    try {
      await onUpload(files);
      onOpenChange(false);
      setFiles([]);
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const dropped = Array.from(e.dataTransfer.files || []);
    if (!dropped.length) return;
    const filtered = accept
      ? dropped.filter(f => accept.split(",").some(ext => f.name.toLowerCase().endsWith(ext.trim().toLowerCase())))
      : dropped;
    setFiles(multiple ? filtered : filtered.slice(0, 1));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent
        className="max-h-[90vh] max-w-[720px] overflow-hidden p-0" // paddings only for body; header/footer keep their own
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
        onDrop={onDrop}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="pr-10">{title}</DialogTitle>
          <button
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-lg outline-none focus:outline-none focus:ring-0"
          >
            <X className="h-5 w-5 opacity-70 hover:opacity-100" />
          </button>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="px-6 pb-6 overflow-auto">
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center",
              "hover:bg-muted/50 transition-colors cursor-pointer"
            )}
            onClick={() => inputRef.current?.click()}
          >
            <p className="mb-2 font-medium">Перетащите файл сюда или выберите вручную</p>
            {accept && <p className="text-sm text-muted-foreground mb-2">Допустимые типы: {accept}</p>}
            <input
              ref={inputRef}
              type="file"
              accept={accept || undefined}
              multiple={multiple}
              className="hidden"
              onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
            />
            <div className="mt-3 text-sm">
              {files.length
                ? <span className="font-medium">Выбрано: {files.map(f => f.name).join(", ")}</span>
                : <span className="text-muted-foreground">Файл не выбран</span>}
            </div>
          </div>

          {requirements && (
            <div className="mt-6 text-sm text-muted-foreground">{requirements}</div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Закрыть</Button>
          <Button onClick={handleUpload} disabled={busy || !files.length}>
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
