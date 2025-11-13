import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { UploadDialog } from "@/components/ui/upload-dialog";

type FileRow = {
  id: number;
  original_name: string;
  title?: string | null;
  doc_number?: string | null;
  doc_date?: string | null;
  author?: string | null;
  doc_type?: string | null;
  group?: string | null;
};

export function SelectFileDialog({
  open,
  onOpenChange,
  objectId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  objectId?: number | null;
  onSelect: (file: FileRow) => void;
}) {
  const [tab, setTab] = React.useState<"list" | "upload">("list");
  const [rows, setRows] = React.useState<FileRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState<string>("");
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!objectId) {
      setRows([]);
      setErr(null);
      return;
    }
    (async () => {
      setErr(null);
      try {
        const r = await fetch(`/api/files/objects/${objectId}`);
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setErr(String(e?.message ?? e));
        setRows([]);
      }
    })();
  }, [open, objectId]);

  const filtered = React.useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const s = [
        r.original_name,
        r.title,
        r.doc_number,
        r.author,
        r.doc_type,
      ].filter(Boolean).join(" ").toLowerCase();
      return s.includes(q);
    });
  }, [rows, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Выбор файла</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="flex items-center gap-2">
            <button
              className={`h-8 rounded-xl border px-3 text-sm ${tab === "list" ? "bg-zinc-100" : ""}`}
              onClick={() => setTab("list")}
            >
              Из ранее загруженных
            </button>
            <button
              className={`h-8 rounded-xl border px-3 text-sm ${tab === "upload" ? "bg-zinc-100" : ""}`}
              onClick={() => setTab("upload")}
            >
              Загрузить файл
            </button>
          </div>
          <div className="mt-3">
            {tab === "list" && (
              <>
                {!objectId && (
                  <div className="mb-2 text-sm text-amber-700">
                    Для списка требуется выбранный объект документа. Загрузка доступна на соседней вкладке.
                  </div>
                )}
                <div className="mb-2 flex items-center gap-2">
                  <input
                    className="h-8 border rounded px-2 w-80"
                    placeholder="Поиск по имени, названию, номеру, автору..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={!objectId}
                  />
                </div>
                {err && <div className="text-sm text-red-700">{err}</div>}
                <ul className="mt-1 space-y-1 text-sm">
                  {filtered.map((r) => (
                    <li key={r.id} className="border rounded p-2 flex items-center gap-2">
                      <span className="w-24 text-xs">ID #{r.id}</span>
                      <span className="truncate w-[220px]" title={r.original_name}><b>{r.original_name}</b></span>
                      <span className="truncate w-[220px]" title={r.title ?? ""}>{r.title ?? "—"}</span>
                      <span className="truncate w-[120px]" title={r.doc_number ?? ""}>{r.doc_number ?? "—"}</span>
                      <span className="truncate w-[160px]" title={r.author ?? ""}>{r.author ?? "—"}</span>
                      <button className="ml-auto h-8 rounded-xl border px-3 text-sm" onClick={() => onSelect(r)}>
                        Выбрать
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && <li className="text-zinc-500">Файлов нет</li>}
                </ul>
              </>
            )}
            {tab === "upload" && (
              <>
                <div className="mb-2 text-sm">
                  Загрузите новый файл и свяжите его с текущим документом.
                </div>
                <button
                  className="h-9 rounded-[var(--radius)] border px-3 text-sm"
                  onClick={() => setUploadOpen(true)}
                  disabled={!objectId}
                  title={!objectId ? "Не выбран объект документа" : undefined}
                >
                  Открыть загрузчик
                </button>
                <div className="mt-2 text-sm text-zinc-500">
                  Требуется выбранный объект документа для загрузки.
                </div>
                {uploadOpen && (
                  <UploadDialog
                    open={uploadOpen}
                    onOpenChange={(v) => setUploadOpen(v)}
                    title="Загрузка файла (PDF)"
                    accept=".pdf"
                    multiple={false}
                    mime={["application/pdf"]}
                    maxSizeBytes={80 * 1024 * 1024}
                    requirements={
                      <>
                        <div>Допустимые расширения: <b>.pdf</b></div>
                        <div>Допустимый MIME: <code>application/pdf</code></div>
                        <div>Максимальный размер: <b>80 МБ</b></div>
                        <div>Файл будет привязан к текущему объекту.</div>
                        {uploadErr && (
                          <div className="mt-2 text-sm text-red-600 whitespace-pre-wrap">
                            {uploadErr}
                          </div>
                        )}
                      </>
                    }
                    onUpload={async ([file]) => {
                      if (!objectId) throw new Error("Сначала выберите объект.");
                      setUploadErr(null);
                      const fd = new FormData();
                      fd.append("object_id", String(objectId));
                      fd.append("f", file);
                      const r = await fetch("/api/files", { method: "POST", body: fd });
                      if (!r.ok) {
                        const txt = await r.text();
                        let msg = txt;
                        try {
                          const j = JSON.parse(txt);
                          msg = j?.detail || JSON.stringify(j);
                        } catch { /* not json */ }
                        setUploadErr(msg || `HTTP ${r.status}`);
                        throw new Error(msg || `HTTP ${r.status}`);
                      }
                      onOpenChange(false);
                    }}
                    primaryLabel="Загрузить"
                  />
                )}
              </>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <button className="h-9 rounded-[var(--radius)] border px-3 text-sm text-white bg-black">
              Закрыть
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



