import * as React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/ui/upload-dialog";
import { makeFileColumns, initialFilesSizing, initialFilesVisibility, type FileRow as FileRowType } from "@/features/files/columns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";

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
  // версии выбранного файла
  const [versionsOf, setVersionsOf] = React.useState<FileRow | null>(null);
  const [versions, setVersions] = React.useState<any[] | null>(null);
  const [verr, setVerr] = React.useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versionsPage, setVersionsPage] = React.useState(1);
  const [busyDelId, setBusyDelId] = React.useState<number | null>(null);
  // диалоги загрузки: новая версия, .sig
  const [upOpen, setUpOpen] = React.useState<null | "ver" | { verId: number }>(null);
  const [upErr, setUpErr] = React.useState<string | null>(null);


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

  async function reloadVersions(fileId: number) {
    setVerr(null);
    try {
      const r = await fetch(`/api/files/${fileId}/versions`);
      if (!r.ok) throw new Error(await r.text());
      setVersions(await r.json());
    } catch (e:any) {
      setVersions([]);
      setVerr(String(e?.message ?? e));
    }
  }

  const columns = React.useMemo(() => makeFileColumns({
    onCopyId: (id)=> navigator.clipboard.writeText(String(id)),
    onOpenMeta: (row)=> { setModalErr(null); setEditRow(row); },
    onDelete: (row)=> { setModalErr(null); setDeleteRow(row); },
    onDownload: (row)=> {/* TODO: download link */},
    onUploadSig: (row)=> {/* будет в модалке на конкретной версии */},
    onOpenVersions: async (row)=> {
      setVersionsOf(row);
      setVersionsPage(1);
      await reloadVersions(row.id);
      setVersionsOpen(true);
    },
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

      {/* Модалка «Версии файла» */}
      {versionsOpen && versionsOf && (
        <VersionsDialog
          file={versionsOf}
          versions={versions || []}
          page={versionsPage}
          onPageChange={setVersionsPage}
          error={verr}
          busyDelId={busyDelId}
          onClose={()=>{ setVersionsOpen(false); setVersionsOf(null); setVersions(null); setVerr(null); setVersionsPage(1); }}
          onReload={()=> reloadVersions(versionsOf.id)}
          onNewVersion={()=> { setUpErr(null); setUpOpen("ver"); }}
          onDeleteVersion={async (verId:number)=>{
            setBusyDelId(verId);
            try {
              const r = await fetch(`/api/files/versions/${verId}`, { method: "DELETE" });
              if (!r.ok) throw new Error(await r.text());
              await reloadVersions(versionsOf.id);
              await reload(); // ← тоже обновляем главную таблицу
            } catch(e:any) {
              setVerr(String(e?.message ?? e));
            } finally {
              setBusyDelId(null);
            }
          }}
          onUploadSig={(verId:number)=> { setUpErr(null); setUpOpen({ verId }); }}
        />
      )}

      {/* Диалог: загрузка новой версии (PDF) */}
      {upOpen === "ver" && versionsOf && (
        <UploadDialog
          open={true}
          onOpenChange={(v)=> { if (!v) setUpOpen(null); }}
          title={`Новая версия: ${versionsOf.original_name}`}
          accept=".pdf"
          multiple={false}
          mime={["application/pdf"]}
          maxSizeBytes={80 * 1024 * 1024}
          requirements={<>PDF до 80 МБ. Будет создана новая версия файла.</>}
          onUpload={async ([file])=>{
            setUpErr(null);
            const fd = new FormData();
            fd.append("f", file);
            const r = await fetch(`/api/files/${versionsOf.id}/versions`, { method: "POST", body: fd });
            if (!r.ok) {
              const t = await r.text(); setUpErr(t || `HTTP ${r.status}`); throw new Error(t||`HTTP ${r.status}`);
            }
            setUpOpen(null);
            await reloadVersions(versionsOf.id);
            await reload(); // ← обновим главную таблицу, чтобы потянулась новая «последняя версия»
          }}
          primaryLabel="Загрузить версию"
        />
      )}

      {/* Диалог: загрузка подписи .sig к версии */}
      {upOpen && upOpen !== "ver" && (
        <UploadDialog
          open={true}
          onOpenChange={(v)=> { if (!v) setUpOpen(null); }}
          title={`Загрузка подписи (.sig)`}
          accept=".sig"
          multiple={false}
          mime={["application/octet-stream","application/pkcs7-signature"]}
          maxSizeBytes={20 * 1024 * 1024}
          requirements={<>Допустимо расширение .sig. Файл привяжется к выбранной версии.</>}
          onUpload={async ([file])=>{
            setUpErr(null);
            const fd = new FormData();
            fd.append("sig", file);
            const r = await fetch(`/api/files/versions/${(upOpen as any).verId}/signatures`, { method: "POST", body: fd });
            if (!r.ok) {
              const t = await r.text(); setUpErr(t || `HTTP ${r.status}`); throw new Error(t||`HTTP ${r.status}`);
            }
            setUpOpen(null);
            if (versionsOf) {
              await reloadVersions(versionsOf.id);
              await reload(); // ← обновим главную таблицу, чтобы потянулась новая «последняя версия»
            }
          }}
          primaryLabel="Загрузить подпись"
        />
      )}


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
        <div className="text-lg font-semibold mb-2">Редактирование данных</div>
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
          <button className="h-8 rounded-[var(--radius)] px-3 border text-white bg-black"
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

function VersionsDialog({
  file, versions, page, onPageChange,
  error, busyDelId, onClose, onReload, onNewVersion, onDeleteVersion, onUploadSig
}: {
  file: any;
  versions: any[];
  page: number;
  onPageChange: (p:number)=>void;
  error: string | null;
  busyDelId: number | null;
  onClose: ()=>void;
  onReload: ()=>void|Promise<void>;
  onNewVersion: ()=>void;
  onDeleteVersion: (verId:number)=>void|Promise<void>;
  onUploadSig: (verId:number)=>void;
}) {
  const PAGE_SIZE = 5;
  const ROW_H = 50;
  const GAP = 4;
  const total = versions.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = versions.slice(start, start + PAGE_SIZE);
  const remaining = Math.max(0, PAGE_SIZE - pageItems.length);
  const fillerH = remaining > 0 ? (remaining * ROW_H + Math.max(0, remaining - 1) * GAP) : 0;

  // Используем универсальный Dialog, как в DocumentsList: заголовок, тело, футер
  return (
    <Dialog open={true} onOpenChange={(o)=>{ if(!o) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Версии файла #{file.id}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* Подсказка над списком — краткое описание */}
          <div className="text-sm font-medium flex items-center gap-2">
            <span>Список загруженных версий файла.</span>
          </div>
          <div className="pt-2">
            {error && <div className="mb-2 text-sm text-red-700 whitespace-pre-wrap">{error}</div>}
            <ul className="mt-1 space-y-1 text-sm">
              {pageItems.map((v, idx) => (
                <li
                  key={v.id}
                  className={
                    "border rounded p-2 flex items-center gap-3 relative " +
                    (v.is_deleted ? "bg-red-50 border-red-300 " : v.is_latest ? "bg-amber-50 border-amber-300 " : "")
                  }
                >
                  {/* Подсказка: иконка 'i' + выпадение вправо; смещение зависит от номера строки (1..5) */}
                  <RowTip indexInPage={idx + 1}>
                      <div><b>Версия:</b> #{v.id} {v.is_deleted && <b className="text-red-800">Версия удалена!</b>}</div>
                      <div><b>Имя файла:</b> {v.original_name}</div>
                      <div><b>Размер:</b> {(Number(v.size||0)/1024/1024).toFixed(2)} МБ ({v.size} байт)</div>
                      <div><b>Загружено:</b> {new Date(v.created_at).toLocaleString()}</div>
                      <div><b>MIME:</b> {v.mime || "—"}</div>
                      <div><b>SHA-256:</b> <code className="break-all">{v.sha256 || "—"}</code></div>
                      <div><b>CRC32:</b> <code>{v.crc32 || "—"}</code></div>
                      {v.storage_path && <div><b>Хранилище:</b> <code className="break-all">{v.storage_path}</code></div>}                    
                  </RowTip>
                  {/* Номер версии */}
                  <span className="w-[80px]">Версия #{v.id}</span>
                  {/* Имя файла */}
                  <span className="truncate w-[150px]" title={v.original_name}><b>{v.original_name}</b></span>
                  {/* Размер */}
                  <code className="text-xs w-[60px]">{(Number(v.size||0)/1024/1024).toFixed(2)} МБ</code>
                  {/* Дата/время */}
                  <span className="text-xs w-[70px]">{new Date(v.created_at).toLocaleString()}</span>
                  {/* CRC32 */}
                  <span className="text-xs w-[70px]">CRC32: <code>{v.crc32 || "—"}</code></span>
                  {/* Действия справа */}
                  { !v.is_deleted &&
                  <div className="ml-auto items-center gap-2">
                    <button className="h-8 rounded-[var(--radius)] mr-2 px-2 text-xs border"
                            onClick={()=> onUploadSig(v.id)}>
                      Подпись
                    </button>
                    <button className="h-8 rounded-[var(--radius)] px-2 text-xs border text-red-700 disabled:opacity-50"
                            disabled={busyDelId === v.id}
                            onClick={()=> onDeleteVersion(v.id)}>
                      {busyDelId === v.id ? "Удаление…" : "Удалить"}
                    </button>
                  </div>
                  }
                  { v.is_deleted &&
                  <div className="ml-auto  items-center gap-2"></div>
                  }
                </li>
              ))}
              {versions.length === 0 && <li className="text-zinc-500">Версий пока нет</li>}
              {fillerH > 0 && <li aria-hidden className="border rounded bg-white" style={{ minHeight: fillerH }} />}
            </ul>
            {/* Пагинация */}
            <div className="mt-2 flex items-center justify-between text-sm">
              <div className="text-zinc-500">Страница {page} из {totalPages}</div>
              <div className="flex items-center gap-2">
                <button className="h-8 rounded-[var(--radius)] px-3 text-xs border disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={()=> onPageChange(Math.max(1, page-1))}>Назад</button>
                <button className="h-8 rounded-[var(--radius)] px-3 text-xs border disabled:opacity-50"
                        disabled={page >= totalPages}
                        onClick={()=> onPageChange(Math.min(totalPages, page+1))}>Вперёд</button>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <button className="h-9 rounded-[var(--radius)] border px-3 text-sm" onClick={onNewVersion}>
            Новая версия
          </button>
          <DialogClose asChild>
            <button className="h-9 rounded-[var(--radius)] border px-3 text-sm text-white bg-black">Закрыть</button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * RowTip — простая подсказка: кнопка «i» и выпадение вправо с предопределённым
 * вертикальным смещением по номеру строки в пределах страницы (1..5).
 * 1: вниз-вправо с небольшим подъёмом (20-25px)
 * 2: вниз-вправо с большим подъёмом (45-50px)
 * 3: строго по центру якоря
 * 4: вверх-вправо со смещением вниз 45-50px
 * 5: вверх-вправо со смещением вниз 20-25px
 */
function RowTip({ indexInPage, children }: { indexInPage: number; children: React.ReactNode }) {
  const offsetCls =
    indexInPage === 1
      ? "top-full -translate-y-[22px]"   // вниз+вправо, чуть вверх ~22px
      : indexInPage === 2
      ? "top-full -translate-y-[48px]"   // вниз+вправо, вверх ~48px
      : indexInPage === 3
      ? "top-1/2 -translate-y-1/2"       // по центру
      : indexInPage === 4
      ? "bottom-full translate-y-[48px]"  // вверх+вправо, вниз ~48px
      : "bottom-full translate-y-[22px]"; // вверх+вправо, вниз ~22px

  return (
    <span className="relative group inline-flex items-center w-[20px]">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border text-[11px] cursor-help select-none">i</span>
      <div className={`hidden group-hover:block absolute left-full ml-2 z-50 w-[360px] rounded border bg-white p-3 shadow transform ${offsetCls}`}>
        {children}
      </div>
    </span>
  );
}