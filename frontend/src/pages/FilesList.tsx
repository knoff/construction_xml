import * as React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/ui/upload-dialog";
import { makeFileColumns, initialFilesSizing, initialFilesVisibility, type FileRow as FileRowType } from "@/features/files/columns";

type FileRow = FileRowType;
type ObjOpt = { id: number; name: string };

export default function FilesList() {
  const [data, setData] = React.useState<FileRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState<string | null>(null);
  // список объектов + выбранный
  const [objects, setObjects] = React.useState<ObjOpt[]>([]);
  const [objectFilter, setObjectFilter] = React.useState<number | null>(null);
  // модалки
  const [editRow, setEditRow] = React.useState<FileRow | null>(null);
  const [deleteRow, setDeleteRow] = React.useState<FileRow | null>(null);
  const [modalErr, setModalErr] = React.useState<string | null>(null);

  async function reload() {
    setErr(null);
    try {
      if (!objectFilter) { setData([]); return; }
      const r = await fetch(`/api/files/objects/${objectFilter}`);
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setData([]);
    }
  }

  React.useEffect(() => { reload(); /* eslint-disable-line */ }, [objectFilter]);

  // подгружаем список объектов для выпадающего списка
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/objects`);
        if (!r.ok) return;
        const arr = await r.json();
        // ожидаем [{id, name}] — если структура иная, адаптируем маппинг здесь
        setObjects(Array.isArray(arr) ? arr : []);
      } catch { /* noop */ }
    })();
  }, []);

  const columns = React.useMemo(() => makeFileColumns({
    onCopyId: (id)=> navigator.clipboard.writeText(String(id)),
    onOpenMeta: (row)=> { setModalErr(null); setEditRow(row); },
    onDelete: (row)=> { setModalErr(null); setDeleteRow(row); },
    onDownload: (row)=> {/* TODO: download link */},
    onUploadSig: (row)=> {/* TODO: open .sig upload */},
  }), []);

  if (err) return <div className="p-6 text-red-700">Ошибка: {err}</div>;
  if (!data) return <div className="p-6">Загрузка…</div>;

  return (
    <div className="p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-sm">Объект:</label>
        <select
          className="h-8 border rounded px-2 min-w-[18rem]"
          value={objectFilter ?? ""}
          onChange={(e)=> setObjectFilter(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— Выберите объект —</option>
          {objects.map(o=> (
            <option key={o.id} value={o.id}>{o.name ?? `#${o.id}`}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns as any}
        data={data}
        rightActions={
          <Button onClick={() => setUploadOpen(true)} disabled={!objectFilter}>
            Загрузить файл
          </Button>
        }
        initialVisibility={initialFilesVisibility}
        initialSizing={initialFilesSizing}
        initialPageSize={10}
      />

      {/* Диалог загрузки: PDF, строго с привязкой к выбранному объекту, лимит 80 МБ */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
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
            <div>Файл будет привязан к выбранному объекту.</div>
            {uploadErr && (
              <div className="mt-2 text-sm text-red-600 whitespace-pre-wrap">
                {uploadErr}
              </div>
            )}
          </>
        }
        onUpload={async ([file]) => {
          if (!objectFilter) throw new Error("Сначала выберите объект.");
          setUploadErr(null);
          const fd = new FormData();
          fd.append("object_id", String(objectFilter));  // Form(...) на сервере
          fd.append("f", file);
          const r = await fetch("/api/files", { method: "POST", body: fd });
          if (!r.ok) {
            // пытаемся вытащить JSON.detail; иначе показываем текст
            const txt = await r.text();
            let msg = txt;
            try {
              const j = JSON.parse(txt);
              msg = j?.detail || JSON.stringify(j);
            } catch { /* not json */ }
            setUploadErr(msg || `HTTP ${r.status}`);
            // ВАЖНО: пробросить, чтобы UploadDialog НЕ закрывался
            throw new Error(msg || `HTTP ${r.status}`);
          }
          // успех — закрываем и обновляем список
          setUploadOpen(false);
          await reload();
        }}
        primaryLabel="Загрузить"
      />

      {/* Диалог редактирования метаданных */}
      {editRow && (
        <EditMetaDialog
          row={editRow}
          error={modalErr}
          onClose={()=> { setEditRow(null); setModalErr(null); }}
          onSave={async (patch) => {
            setModalErr(null);
            const r = await fetch(`/api/files/${editRow.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
            });
            if (!r.ok) {
              const t = await r.text(); setModalErr(t || `HTTP ${r.status}`); return;
            }
            setEditRow(null);
            await reload();
          }}
        />
      )}

      {/* Подтверждение удаления */}
      {deleteRow && (
        <ConfirmDelete
          row={deleteRow}
          error={modalErr}
          onClose={()=> { setDeleteRow(null); setModalErr(null); }}
          onConfirm={async ()=>{
            setModalErr(null);
            const r = await fetch(`/api/files/${deleteRow.id}`, { method: "DELETE" });
            if (!r.ok) {
              const t = await r.text(); setModalErr(t || `HTTP ${r.status}`); return;
            }
            setDeleteRow(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}


function EditMetaDialog({
  row, onClose, onSave, error
}: {
  row: any;
  onClose: ()=>void;
  onSave: (patch: any)=>void|Promise<void>;
  error?: string | null;
}) {
  const [title, setTitle] = React.useState(row.title || "");
  const [docNumber, setDocNumber] = React.useState(row.doc_number || "");
  const [docDate, setDocDate] = React.useState(row.doc_date || "");
  const [author, setAuthor] = React.useState(row.author || "");
  const [docType, setDocType] = React.useState(row.doc_type || "");
  const [group, setGroup] = React.useState(row.group || "");
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded shadow-lg p-4 w-[560px]">
        <div className="text-lg font-semibold mb-2">Редактирование метаданных</div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="w-40 text-sm text-zinc-700">Название:</label>
            <input className="h-8 border rounded px-2 grow" value={title} onChange={e=> setTitle(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-40 text-sm text-zinc-700">Номер:</label>
            <input className="h-8 border rounded px-2 w-48" value={docNumber} onChange={e=> setDocNumber(e.target.value)} />
            <label className="w-16 text-sm text-zinc-700 text-right">Дата:</label>
            <input className="h-8 border rounded px-2 w-40" type="date" value={docDate} onChange={e=> setDocDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-40 text-sm text-zinc-700">Автор:</label>
            <input className="h-8 border rounded px-2 grow" value={author} onChange={e=> setAuthor(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-40 text-sm text-zinc-700">Тип:</label>
            <input className="h-8 border rounded px-2 w-56" value={docType} onChange={e=> setDocType(e.target.value)} />
            <label className="w-20 text-sm text-zinc-700 text-right">Группа:</label>
            <select className="h-8 border rounded px-2 w-28" value={group} onChange={e=> setGroup(e.target.value)}>
              <option value="">—</option>
              <option value="IRD">ИРД</option>
              <option value="PD">ПД</option>
            </select>
          </div>
          {error && <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="h-8 rounded-[var(--radius)] px-3 border" onClick={onClose}>Отмена</button>
          <button className="h-8 rounded-[var(--radius)] px-3 border"
                  onClick={()=> onSave({
                    title, doc_number: docNumber, doc_date: docDate, author, doc_type: docType, group: group || null
                  })}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({
  row, onClose, onConfirm, error
}: {
  row: any;
  onClose: ()=>void;
  onConfirm: ()=>void|Promise<void>;
  error?: string | null;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded shadow-lg p-4 w-[460px]">
        <div className="text-lg font-semibold mb-2">Удалить файл?</div>
        <div className="text-sm">Файл <b>{row.original_name}</b> будет помечен как удалённый и удалён из хранилища.</div>
        {error && <div className="mt-2 text-sm text-red-600 whitespace-pre-wrap">{error}</div>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="h-8 rounded-[var(--radius)] px-3 border" onClick={onClose}>Отмена</button>
          <button className="h-8 rounded-[var(--radius)] px-3 border text-red-700"
                  onClick={onConfirm}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}