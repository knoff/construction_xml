import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UploadDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title?: string;
  accept?: string;
  multiple?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  requirements?: React.ReactNode;
  primaryLabel?: string;
  maxSizeBytes?: number;
  mime?: string[];
};

export function UploadDialog({
  open,
  onOpenChange,
  title = "Загрузка файла",
  accept = "",
  multiple = false,
  onUpload,
  requirements,
  primaryLabel = "Загрузить",
  maxSizeBytes = 80 * 1024 * 1024,
  mime,
}: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const acceptExts = useMemo(
    () => accept.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean),
    [accept],
  );

  const mimeList = useMemo(() => mime?.map((item) => item.toLowerCase()), [mime]);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setErrors([]);
      setBusy(false);
      setDragActive(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  const validateFiles = (candidates: File[]) => {
    const nextErrors: string[] = [];
    const allowed: File[] = [];

    for (const file of candidates) {
      let invalid = false;

      if (maxSizeBytes && file.size > maxSizeBytes) {
        nextErrors.push(`${file.name}: превышает ${(maxSizeBytes / 1024 / 1024) | 0} МБ`);
        invalid = true;
      }

      if (!invalid && acceptExts.length) {
        const fitsExt = acceptExts.some((ext) => file.name.toLowerCase().endsWith(ext));
        if (!fitsExt) {
          nextErrors.push(`${file.name}: недопустимое расширение (ожидается ${accept})`);
          invalid = true;
        }
      }

      if (!invalid && mimeList?.length && file.type) {
        const currentMime = file.type.toLowerCase();
        if (!mimeList.includes(currentMime)) {
          nextErrors.push(`${file.name}: MIME ${file.type} не допускается`);
          invalid = true;
        }
      }

      if (!invalid) {
        allowed.push(file);
      }
    }

    setErrors(nextErrors);
    setFiles(multiple ? allowed : allowed.slice(0, 1));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      await onUpload(files);
      onOpenChange(false);
      setFiles([]);
    } finally {
      setBusy(false);
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(event.dataTransfer.files ?? []);
    if (!dropped.length) return;
    validateFiles(dropped);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleKeyActivate: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onDrop={handleDrop} onDragOver={handleDragOver}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div
            role="button"
            tabIndex={0}
            aria-label="Область выбора или перетаскивания файла"
            className={[
              "rounded-2xl border-2 p-6 text-center transition focus:outline-none focus:ring-2 focus:ring-offset-2",
              dragActive ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-dashed hover:border-primary hover:bg-muted/50",
            ].join(" ")}
            onClick={() => inputRef.current?.click()}
            onKeyDown={handleKeyActivate}
            onDragLeave={handleDragLeave}
          >
            <p className="mb-2 font-medium">Перетащите файл сюда или выберите вручную</p>
            {acceptExts.length ? (
              <p className="mb-2 text-sm text-muted-foreground">Допустимые типы: {acceptExts.join(", ")}</p>
            ) : null}

            <input
              ref={inputRef}
              type="file"
              accept={accept || undefined}
              multiple={multiple}
              className="hidden"
              onChange={(event) => {
                const next = event.target.files ? Array.from(event.target.files) : [];
                validateFiles(next);
              }}
            />

            <div className="mt-3 text-sm">
              {files.length ? (
                <span className="font-medium">Выбрано: {files.map((file) => file.name).join(", ")}</span>
              ) : (
                <span className="text-muted-foreground">Файл не выбран</span>
              )}
            </div>
          </div>

          {requirements ? <div className="mt-6 text-sm text-muted-foreground">{requirements}</div> : null}

          {errors.length ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Закрыть
            </Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={!files.length || busy}>
            {busy ? "Загрузка..." : primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
