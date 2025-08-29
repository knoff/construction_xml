"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Типы данных
type SchemaDetail = {
  id: number | string;
  name: string;
  version?: string;
  namespace?: string;
  description?: string;
  type?: { id?: number | string; title?: string; code?: string };
};

type SchemaTypeRow = { id: number; code: string; title: string };

export function SchemaEditDialog({
  open,
  schemaId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  schemaId: number | string | null;
  onOpenChange: (next: boolean) => void;
  onSaved?: (updated: SchemaDetail) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [item, setItem] = React.useState<SchemaDetail | null>(null);
  const [types, setTypes] = React.useState<SchemaTypeRow[]>([]);

  // Загрузить запись и типы (если API типов ещё нет — просто покажем ошибку, UI соберётся)
  React.useEffect(() => {
    if (!open || schemaId == null) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [r1, r2] = await Promise.allSettled([
          fetch(`/api/schemas/${schemaId}`),
          fetch(`/api/schemas/types`),
        ]);
        if (r1.status === "fulfilled") {
          if (!r1.value.ok) throw new Error(await r1.value.text());
          setItem(await r1.value.json());
        } else {
          throw r1.reason;
        }
        if (r2.status === "fulfilled" && r2.value.ok) {
          setTypes(await r2.value.json());
        } // если не ок — просто оставим пустой список
      } catch (e: any) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, schemaId]);

  async function save() {
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: item.name ?? "",
        version: item.version ?? "",
        namespace: item.namespace ?? "",
        description: item.description ?? "",
        type_id: item.type?.id ?? null,
      };
      const r = await fetch(`/api/schemas/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      const updated = await r.json();
      onSaved?.(updated);
      onOpenChange(false);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  // Общие классы для textarea/select (как у Input)
  const fieldClass = cn(
    "flex w-full rounded-[var(--radius)] border bg-white px-3 py-2 text-sm",
    "placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить схему</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {loading && <div className="text-sm">Загрузка…</div>}
          {error && <div className="text-sm text-red-700">Ошибка: {error}</div>}
          {item && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Имя</div>
                  <Input value={item.name ?? ""} onChange={(e) => setItem({ ...item, name: e.target.value })} />
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Версия</div>
                  <Input value={item.version ?? ""} onChange={(e) => setItem({ ...item, version: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-zinc-500 mb-1">Namespace</div>
                  <Input value={item.namespace ?? ""} onChange={(e) => setItem({ ...item, namespace: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-zinc-500 mb-1">Тип схемы</div>
                  <select
                    className={fieldClass}
                    value={String(item.type?.id ?? "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItem({ ...item, type: v ? { id: Number(v) } : undefined });
                    }}
                  >
                    <option value="">— Не задан —</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-zinc-500 mb-1">Описание</div>
                  <textarea
                    className={fieldClass}
                    rows={4}
                    value={item.description ?? ""}
                    onChange={(e) => setItem({ ...item, description: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>Отмена</Button>
          </DialogClose>
          <Button onClick={save} disabled={saving || !item}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
