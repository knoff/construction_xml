import * as React from "react";
import type { FieldModel } from "@/features/forms/types";
import { pathKey } from "@/features/forms/utils/path";
import { useFormStateController } from "@/features/forms/Renderer/contexts";
import { useDocumentMeta } from "@/pages/DocumentFill";
import { SelectFileDialog } from "./SelectFileDialog";

type FormValue = {
  fileId?: number | null;
  meta?: {
    docTypeCode?: string | null;
    title?: string | null;
    docDate?: string | null;
    author?: string | null;
    fileName?: string | null;
    fileFormat?: string | null;
    checksum?: string | null;
    docNumber?: string | null;
    group?: string | null;
  };
  overrides?: Record<string, boolean>;
  lastSyncedAt?: string | null;
};

export default function FileMetaBlock({
  f, path,
}: {
  f: FieldModel;
  path: (string | number)[];
}) {
  const { state, setPath } = useFormStateController<any>();
  const doc = useDocumentMeta();
  const pk = pathKey(path);

  const value = (getAt(state, path) as FormValue) ?? {};
  const fileId = value?.fileId ?? null;
  const meta = value?.meta ?? {};
  const overrides = value?.overrides ?? {};

  const [entity, setEntity] = React.useState<any | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [selOpen, setSelOpen] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!fileId) { setEntity(null); return; }
      try {
        const r = await fetch(`/api/files/${fileId}`);
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        setEntity(j);
      } catch {
        setEntity(null);
      }
    })();
  }, [fileId]);

  function getAt(obj: any, p: (string | number)[]) {
    let cur = obj;
    for (const k of p) {
      if (cur == null) return undefined;
      cur = cur[k as any];
    }
    return cur;
  }
  function write(next: Partial<FormValue>) {
    const current = (getAt(state, path) as FormValue) ?? {};
    setPath(path, { ...current, ...next });
  }
  function normalize(s: string) { return s.trim(); }
  function entityValueFor(field: keyof NonNullable<FormValue["meta"]>) {
    if (!entity) return null;
    switch (field) {
      case "title": return entity.title ?? null;
      case "docNumber": return entity.doc_number ?? null;
      case "docDate": return entity.doc_date ?? null;
      case "author": return entity.author ?? null;
      case "docTypeCode": return entity.doc_type ?? null;
      case "fileName": return entity.original_name ?? null;
      case "fileFormat": return entity.mime ?? null;
      case "checksum": return entity.sha256 ?? null;
      case "group": return entity.group ?? null;
      default: return null;
    }
  }
  function writeMeta(field: keyof NonNullable<FormValue["meta"]>, v: string) {
    const nextMeta = { ...(meta || {}), [field]: v };
    const entVal = entityValueFor(field);
    const isOverride = normalize(String(v)) !== normalize(String(entVal ?? ""));
    const nextOverrides = { ...(overrides || {}) };
    nextOverrides[String(field)] = isOverride;
    write({ meta: nextMeta, overrides: nextOverrides });
  }
  async function syncFromEntity() {
    if (!entity) return;
    const nextMeta = {
      docTypeCode: entity.doc_type ?? null,
      title: entity.title ?? null,
      docDate: entity.doc_date ?? null,
      author: entity.author ?? null,
      fileName: entity.original_name ?? null,
      fileFormat: entity.mime ?? null,
      checksum: entity.sha256 ?? null,
      docNumber: entity.doc_number ?? null,
      group: entity.group ?? null,
    };
    write({ meta: nextMeta, overrides: {}, lastSyncedAt: new Date().toISOString() });
  }
  async function syncToEntity() {
    if (!fileId) return;
    setBusy(true);
    try {
      const patch: any = {};
      if (overrides.title) patch.title = meta.title ?? null;
      if (overrides.docNumber) patch.doc_number = meta.docNumber ?? null;
      if (overrides.docDate) patch.doc_date = meta.docDate ?? null;
      if (overrides.author) patch.author = meta.author ?? null;
      if (overrides.docTypeCode) patch.doc_type = meta.docTypeCode ?? null;
      if (overrides.group) patch.group = meta.group ?? null;
      if (Object.keys(patch).length > 0) {
        const r = await fetch(`/api/files/${fileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json().catch(() => null);
        setEntity(j || entity);
        const cleared = { ...(overrides || {}) };
        for (const k of Object.keys(patch)) {
          const mapBack = k === "doc_number" ? "docNumber"
            : k === "doc_date" ? "docDate"
            : k === "doc_type" ? "docTypeCode"
            : k;
          delete cleared[mapBack as string];
        }
        write({ overrides: cleared, lastSyncedAt: new Date().toISOString() });
      }
    } catch (e:any) {
      alert(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }
  function onSelectFile(file: any) {
    write({
      fileId: file.id,
      meta: {
        ...(value.meta || {}),
        title: file.title ?? null,
        docNumber: file.doc_number ?? null,
        docDate: file.doc_date ?? null,
        author: file.author ?? null,
        docTypeCode: file.doc_type ?? null,
        fileName: file.original_name ?? null,
      },
      overrides: {},
      lastSyncedAt: new Date().toISOString(),
    });
    setSelOpen(false);
  }

  function FieldRow({
    label, name, placeholder, width = "grow",
  }: {
    label: string;
    name: keyof NonNullable<FormValue["meta"]>;
    placeholder?: string;
    width?: "sm" | "md" | "lg" | "grow";
  }) {
    const wCls = width === "sm" ? "w-40" : width === "md" ? "w-60" : width === "lg" ? "w-80" : "grow";
    const v = (meta as any)?.[name] ?? "";
    const ev = entityValueFor(name);
    const isOverride = normalize(String(v ?? "")) !== normalize(String(ev ?? ""));
    return (
      <div className="flex items-center gap-2">
        <label className="w-44 text-sm text-zinc-700">{label}:</label>
        <input
          className={`h-8 border rounded px-2 ${wCls} ${isOverride ? "border-amber-400 bg-amber-50" : ""}`}
          value={v ?? ""}
          placeholder={placeholder}
          onChange={(e) => writeMeta(name, e.target.value)}
        />
        {isOverride && (
          <button
            className="h-8 rounded-xl border px-2 text-xs"
            title="Сбросить переопределение (из сущности)"
            onClick={() => writeMeta(name, String(ev ?? ""))}
          >
            Сбросить
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-3 space-y-3 bg-white">
      <div className="flex items-center gap-3">
        <div className="text-sm font-medium">
          Метаданные файла {fileId ? <span className="text-zinc-500">• ID #{fileId}</span> : <span className="text-zinc-500">• файл не выбран</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="h-8 rounded-xl border px-3 text-sm" onClick={() => setSelOpen(true)}>
            Связать файл
          </button>
          <button className="h-8 rounded-xl border px-3 text-sm disabled:opacity-50" onClick={syncFromEntity} disabled={!entity}>
            Синхронизировать ← из сущности
          </button>
          <button className="h-8 rounded-xl border px-3 text-sm disabled:opacity-50" onClick={syncToEntity} disabled={!fileId || busy}>
            {busy ? "Синхронизация…" : "Синхронизировать → в сущность"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <FieldRow label="Наименование документа" name="title" />
        <div className="flex items-center gap-2">
          <FieldRow label="Номер документа" name="docNumber" width="md" />
          <label className="w-16 text-sm text-zinc-700 text-right">Дата:</label>
          <input
            className={`h-8 border rounded px-2 w-44 ${
              normalize(String(meta.docDate ?? "")) !== normalize(String(entityValueFor("docDate") ?? "")) ? "border-amber-400 bg-amber-50" : ""
            }`}
            type="date"
            value={meta.docDate ?? ""}
            onChange={(e) => writeMeta("docDate", e.target.value)}
          />
        </div>
        <FieldRow label="Автор" name="author" />
        <div className="flex items-center gap-2">
          <FieldRow label="Код типа документа" name="docTypeCode" width="md" />
          <label className="w-24 text-sm text-zinc-700 text-right">Группа:</label>
          <select
            className={`h-8 border rounded px-2 w-40 ${
              normalize(String(meta.group ?? "")) !== normalize(String(entityValueFor("group") ?? "")) ? "border-amber-400 bg-amber-50" : ""
            }`}
            value={meta.group ?? ""}
            onChange={(e) => writeMeta("group", e.target.value)}
          >
            <option value="">—</option>
            <option value="IRD">ИРД</option>
            <option value="PD">ПД</option>
          </select>
        </div>
      </div>

      <div className="pt-1">
        <div className="text-xs text-zinc-500">
          {value.lastSyncedAt ? <>Последняя синхронизация: {new Date(value.lastSyncedAt).toLocaleString()}</> : "Ещё не синхронизировалось"}
        </div>
      </div>

      {selOpen && (
        <SelectFileDialog
          open={selOpen}
          onOpenChange={setSelOpen}
          objectId={doc.objectId ?? null}
          onSelect={onSelectFile}
        />
      )}
    </div>
  );
}


