"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

type SchemaDetail = {
  id: number | string;
  name: string;
  version?: string;
  namespace?: string;
  description?: string;
  file_path?: string;
  created_at?: string;
  type?: { id?: number | string; title?: string; code?: string };
};

export function SchemaViewDialog({
  open,
  schemaId,
  onOpenChange,
}: {
  open: boolean;
  schemaId: number | string | null;
  onOpenChange: (next: boolean) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [item, setItem] = React.useState<SchemaDetail | null>(null);

  React.useEffect(() => {
    if (!open || schemaId == null) return;
    setLoading(true);
    setError(null);
    setItem(null);
    (async () => {
      try {
        const r = await fetch(`/api/schemas/${schemaId}`);
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setItem(data);
      } catch (e: any) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, schemaId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Просмотр XSD схемы</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {loading && <div className="text-sm">Загрузка…</div>}
          {error && <div className="text-sm text-red-700">Ошибка: {error}</div>}
          {item && (
            <>
              <div className="grid grid-cols-[200px_1fr] gap-x-6 gap-y-2 text-sm">
                <div className="text-zinc-500">ID</div><div className="break-words">{item.id}</div>
                <div className="text-zinc-500">Имя</div><div className="break-words">{item.name}</div>
                <div className="text-zinc-500">Версия</div><div className="break-words">{item.version ?? ""}</div>
                <div className="text-zinc-500">Тип (имя)</div><div className="break-words">{item.type?.title ?? ""}</div>
                <div className="text-zinc-500">Тип (код)</div><div className="break-words">{item.type?.code ?? ""}</div>
                <div className="text-zinc-500">Namespace</div><div className="break-words">{item.namespace ?? ""}</div>
                <div className="text-zinc-500">Описание</div><div className="break-words">{item.description ?? ""}</div>
                <div className="text-zinc-500">Путь</div><div className="break-all">{item.file_path ?? ""}</div>
                <div className="text-zinc-500">Загружено</div><div className="break-words">{formatDateTime(item.created_at)}</div>
              </div>
              {/* Сворачиваемый блок JSON через <details>/<summary> */}
              <details className="rounded-2xl border mt-6">
                <summary className="cursor-pointer select-none px-4 py-2 text-sm text-zinc-600">
                  JSON-представление
                </summary>
                <div className="border-t p-3">
                  <pre className="rounded-xl bg-zinc-50 p-3 text-xs overflow-auto">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </div>
              </details>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          {/* Primary-кнопка по умолчанию + автофокус */}
          <DialogClose asChild>
            <Button autoFocus>Закрыть</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
