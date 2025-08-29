// src/components/ui/upload-dialog.tsx
// Generic upload dialog built on shadcn/ui Dialog
import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogClose, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UploadDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  accept?: string;             // e.g. ".xsd,.xsl,.xslt"
  multiple?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  requirements?: React.ReactNode; // block with rules/hints
  primaryLabel?: string;       // default: "Загрузить"
  maxSizeBytes?: number;       // default: 80MB
  mime?: string[];             // e.g. ["text/xml","application/xml"]
};

export function UploadDialog({
  open, onOpenChange, title = "Загрузка файла",
  accept = "", multiple = false, onUpload,
  requirements, primaryLabel = "Загрузить",
  maxSizeBytes = 80 * 1024 * 1024,
  mime,
}: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isOver, setIsOver] = useState(false); // drag-over highlight
  
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

  // collect all violations (size, extension, mime) per file
  function filterByAccept(list: File[]) {
    if (!accept) return list;
    const exts = accept.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    return list.filter(f => exts.some(ext => f.name.toLowerCase().endsWith(ext)));
  }

  function validate(list: File[]) {
    const errs: string[] = [];
    const ok: File[] = [];
    const mimes = (mime && mime.length) ? mime.map(s => s.toLowerCase()) : undefined;
    for (const f of list) {
      let bad = false;
      if (maxSizeBytes && f.size > maxSizeBytes) {
        errs.push(`${f.name}: превышает ${(maxSizeBytes/1024/1024)|0} МБ`);
        bad = true;
      }
      if (accept) {
        const passesExt = filterByAccept([f]).length > 0;
        if (!passesExt) {
          errs.push(`${f.name}: недопустимое расширение (ожидается ${accept})`);
          bad = true;
        }
      }
      if (mimes && f.type) {
        const mt = f.type.toLowerCase();
        if (!mimes.includes(mt)) {
          errs.push(`${f.name}: MIME ${f.type} не допускается`);
          bad = true;
        }
      }
      if (!bad) ok.push(f);
    }
    return { ok, errs };
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (!dropped.length) return;
    const { ok, errs } = validate(dropped);
    setErrors(errs);
    setFiles(multiple ? ok : ok.slice(0, 1));
  }

  // reset warnings/state on close
  useEffect(() => {
    if (!open) {
      setErrors([]);
      setFiles([]);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isOver) setIsOver(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  }
  function openFilePicker() {
    inputRef.current?.click();
  }
  function onKeyActivate(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <DialogHeader>
          <DialogTitle>
            Загрузка XSD-схемы
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* extra spacing under the header */}
          <div className="mt-4" />

          <div
            role="button"
            tabIndex={0}
            aria-label="Область выбора или перетаскивания файла"
            onClick={openFilePicker}
            onKeyDown={onKeyActivate}
            className={[
              "rounded-2xl p-6 text-center border-2 transition",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              isOver ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-dashed hover:border-primary hover:bg-muted/50"
            ].join(" ")}
          >
            <p className="mb-2 font-medium">
              Перетащите файл сюда или выберите вручную
            </p>
            {accept && (
              <p className="text-sm text-muted-foreground mb-2">
                Допустимые типы: {accept}
              </p>
            )}

            <input
              ref={inputRef}
              type="file"
              accept={accept || undefined}
              multiple={multiple}
              className="hidden"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                const { ok, errs } = validate(list);
                setErrors(errs);
                setFiles(multiple ? ok : ok.slice(0, 1));
              }}
            />

            <div className="mt-3 text-sm">
              {files.length ? (
                <span className="font-medium">
                  Выбрано: {files.map((f) => f.name).join(", ")}
                </span>
              ) : (
                <span className="text-muted-foreground">Файл не выбран</span>
              )}
            </div>
          </div>

          {requirements && (
            <div className="mt-6 text-sm text-muted-foreground">
              {requirements}
            </div>
          )}

          {!!errors.length && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 text-left">
              {errors.map((e, i) => (
                <div key={i}>• {e}</div>
              ))}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Закрыть</Button>
          </DialogClose>
          <Button disabled={!files.length || busy} onClick={handleUpload}>
            {busy ? "Загрузка..." : (primaryLabel || "Загрузить")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
