import * as React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { makeDocumentColumns, type DocumentRow } from "@/features/documents/columns";

export default function DocumentsList() {
  const [data, setData] = React.useState<DocumentRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [objects, setObjects] = React.useState<Array<{id:number; name:string}>>([]);
  const [schemas, setSchemas] = React.useState<Array<{id:number; name:string; version?:string}>>([]);
  const [createObj, setCreateObj] = React.useState<number | "" >("");
  const [createSchema, setCreateSchema] = React.useState<number | "" >("");
  const [viewId, setViewId] = React.useState<number | string | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | string | null>(null);
  const [editObj, setEditObj] = React.useState<number | "" >("");   // выбранный объект
  const currentDoc = React.useMemo(() => data?.find(d => d.id === editId) ?? null, [data, editId]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<number | string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versionsDocId, setVersionsDocId] = React.useState<number | string | null>(null);
  const [versions, setVersions] = React.useState<Array<{
    id:number; created_at:string; payload:any;
    status?: string; is_protected?: boolean; is_selected?: boolean
  }>>([]);
  const PAGE_SIZE = 5;
  // визуальные параметры списка (в пикселях)
  const ROW_H = 50; // min-height одной строки
  const GAP = 4;    // интервал между строками (tailwind space-y-1 = 0.25rem ≈ 4px)
  const [page, setPage] = React.useState(1);
  const [versionsErr, setVersionsErr] = React.useState<string | null>(null);
  const [draftText, setDraftText] = React.useState<string>('{}');

  async function loadVersions(docId: number | string) {
    setVersionsErr(null);
    const r = await fetch(`/api/documents/${docId}/versions`);
    if (!r.ok) { setVersionsErr(await r.text()); setVersions([]); return; }
    const list = await r.json();
    setVersions(list);
    // корректируем страницу при изменении числа версий
    const totalPages = Math.max(1, Math.ceil((list?.length ?? 0) / PAGE_SIZE));
    setPage(p => Math.min(p, totalPages));
    // choose current: selected if present, else newest
    const current = Array.isArray(list) && list.length
      ? (list.find((x:any)=>x.is_selected) ?? list[0])
      : null;
    if (current?.payload != null) {
      try { setDraftText(JSON.stringify(current.payload, null, 2)); }
      catch { setDraftText('{}'); }
    } else {
      setDraftText('{}');
    }
  }

  async function saveCurrent(docId: number | string) {
    setVersionsErr(null);
    // find current version id (selected or newest)
    const current = versions.find(v=>v.is_selected) ?? versions[0];
    if (!current) { setVersionsErr("Нет версий для сохранения"); return; }
    // forbid editing finals
    if (current.status === 'final') { setVersionsErr("Нельзя редактировать финальную версию"); return; }
    // parse JSON
    let payload:any;
    try { payload = JSON.parse(draftText); }
    catch (e:any) { setVersionsErr('Некорректный JSON: ' + (e?.message ?? e)); return; }
    const r = await fetch(`/api/documents/${docId}/versions/${current.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    if (!r.ok) { setVersionsErr(await r.text()); return; }
    // reload list: server downgrades clean->draft on edit
    await loadVersions(docId);
  }

  async function reload() {
    const r = await fetch("/api/documents/");
    if (!r.ok) throw new Error(await r.text());
    setData(await r.json());
  }
  React.useEffect(() => { reload().catch(e=>setErr(String(e))); }, []);
  React.useEffect(() => { fetch("/api/objects/").then(r=>r.json()).then(setObjects).catch(()=>{}); fetch("/api/schemas").then(r=>r.json()).then(setSchemas).catch(()=>{}); }, []);

  const columns = React.useMemo(() => makeDocumentColumns({
    onView: (id) => { setViewId(id); setViewOpen(true); },
    onEdit: (id) => { setEditId(id); setEditOpen(true); },
    onDelete: (row) => { setConfirmId(row.id); setConfirmOpen(true); },
    // новый пункт «Версии» в меню действий
    onVersions: async (id) => {
      setVersionsDocId(id);
      setDraftText('{}');
      await loadVersions(id);
      setVersionsOpen(true);
    },
    onFill: (id) => { window.location.assign(`/ui/documents/${id}/fill`); },
  }), []);

  if (err) return <div className="p-6 text-red-700">Ошибка: {err}</div>;
  if (!data) return <div className="p-6">Загрузка…</div>;

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={data}
        rightActions={<Button onClick={() => setCreateOpen(true)}>Новый документ</Button>}
        initialSizing={{
          object_name: 340,
          schema_name: 180,
          schema_version: 70,
          status: 100,
          created_at: 160,
          updated_at: 160,
          id: 64,
          actions: 64
        }}
        initialVisibility={{ id: false, updated_at: false }}
        initialPageSize={10}
      />

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Создать документ</DialogTitle></DialogHeader>
          <DialogBody>
            <div>
              <div className="text-sm mb-1">Объект</div>
              <select className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full" value={createObj} onChange={(e)=>setCreateObj(Number(e.target.value))}>
                <option value="">— выберите объект —</option>
                {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <div className="text-sm mb-1">Схема</div>
              <select className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full" value={createSchema} onChange={(e)=>setCreateSchema(Number(e.target.value))}>
                <option value="">— выберите схему —</option>
                {schemas.map(s => <option key={s.id} value={s.id}>{s.name}{s.version ? ` (v${s.version})` : ""}</option>)}
              </select>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button></DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black"
              onClick={async () => {
                if (!createObj || !createSchema) return;
                const r = await fetch("/api/documents/", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ object_id: createObj, schema_id: createSchema })
                });
                if (!r.ok) { alert(await r.text()); return; }
                setCreateOpen(false); setCreateObj(""); setCreateSchema(""); await reload();
              }}>Создать</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View */}
      <Dialog open={viewOpen} onOpenChange={(o)=>{ setViewOpen(o); if(!o) setViewId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Просмотр документа</DialogTitle></DialogHeader>
          <DialogBody>
            <pre className="text-xs bg-zinc-50 rounded-xl p-3 overflow-auto">{JSON.stringify(data.find(d=>d.id===viewId), null, 2)}</pre>
          </DialogBody>
          <DialogFooter><DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Закрыть</button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit: статус + перенос в другой объект */}
      <Dialog open={editOpen} onOpenChange={(o)=>{ setEditOpen(o); if(!o) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Статус документа</DialogTitle></DialogHeader>
          <DialogBody>
            <div>
              <div className="text-sm mb-1">Статус</div>
              <div className="flex items-center gap-2">
                <button className="h-9 rounded-[var(--radius)] px-3 text-sm border"
                        onClick={()=> fetch(`/api/documents/${editId}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ status: "draft" }) }).then(async r=>{ if(!r.ok){alert(await r.text());return;} await reload(); })}>
                  draft
                </button>
                <button className="h-9 rounded-[var(--radius)] px-3 text-sm border"
                        onClick={()=> fetch(`/api/documents/${editId}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ status: "final" }) }).then(async r=>{ if(!r.ok){alert(await r.text());return;} await reload(); })}>
                  final
                </button>
              </div>
            </div>
            <div>
              <div className="text-sm mb-1">Объект</div>
              <select className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                      value={editObj || (currentDoc?.object?.id ?? "")}
                      onChange={(e)=> setEditObj(Number(e.target.value))}>
                <option value="">— выберите объект —</option>
                {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button></DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black"
                    onClick={async ()=>{
                      const body: any = {};
                      if (editObj) body.object_id = editObj;
                      if (!body.object_id) { setEditOpen(false); return; }
                      const r = await fetch(`/api/documents/${editId}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) });
                      if (!r.ok) { alert(await r.text()); return; }
                      setEditOpen(false); setEditObj(""); await reload();
                    }}>
              Сохранить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={confirmOpen} onOpenChange={(o)=>{ setConfirmOpen(o); if(!o) setConfirmId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Удалить документ?</DialogTitle></DialogHeader>
          <DialogBody>Действие необратимо.</DialogBody>
          <DialogFooter>
            <DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button></DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-red-600 hover:bg-red-700"
              onClick={async ()=>{
                const id = confirmId; setConfirmOpen(false); setConfirmId(null);
                if (id == null) return;
                const r = await fetch(`/api/documents/${id}`, { method: "DELETE" });
                if (!r.ok && r.status !== 204) { alert(await r.text()); return; }
                await reload();
              }}>Удалить</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions (список версий + добавление черновика) */}
      <Dialog open={versionsOpen} onOpenChange={(o)=>{ setVersionsOpen(o); if(!o){ setVersionsDocId(null); setVersions([]); setDraftText('{}'); setVersionsErr(null);} }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Версии документа</DialogTitle></DialogHeader>
          <DialogBody>
            <div className="space-y-2">
              <div className="text-sm">Сохранить (JSON текущей версии):</div>
              {(() => {
                const current = versions.find(v=>v.is_selected) ?? versions[0];
                const isFinal = current?.status === 'final';
                return (
                  <textarea
                    className="w-full h-40 border rounded p-2 font-mono text-sm disabled:bg-zinc-100"
                    value={draftText}
                    onChange={(e)=>setDraftText(e.target.value)}
                    disabled={isFinal}
                  />
                );
              })()}
              <div>
                {(() => {
                  const current = versions.find(v=>v.is_selected) ?? versions[0];
                  const isFinal = current?.status === 'final';
                  return (
                    <button
                      className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black disabled:opacity-50"
                      onClick={()=> versionsDocId != null && saveCurrent(versionsDocId)}
                      disabled={isFinal}
                    >
                      Сохранить
                    </button>
                  );
                })()}
              </div>
              {versionsErr && <div className="text-sm text-red-700">{versionsErr}</div>}
              {/* Заголовок + иконка-подсказка */}
              <div className="mt-3 text-sm font-medium flex items-center gap-2">
                <span>Список версий</span>
                <span className="relative group inline-flex items-center">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full border text-[11px] cursor-help select-none"
                    aria-label="Подсказка по версиям"
                  >?</span>
                  {/* tooltip: right + up, with slight downward offset (~25% height) */}
                  <div
                    className="
                      hidden group-hover:block absolute
                      left-full ml-2              /* move to the right of the ? */
                      bottom-full                 /* anchor above the ? */
                      translate-y-[25%]           /* small downward shift (~1/4 height) */
                      transform                   /* enable transforms */
                      z-50 w-80 rounded border bg-white p-3 shadow
                    "
                  >
                    <div className="text-xs space-y-2">
                      <div><b>Автоочистка:</b> старые <i>незащищённые</i> версии удаляются автоматически, хранится до 20 последних.</div>
                      <div className="space-y-1">
                        <div className="font-medium">Легенда (строки):</div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded bg-amber-50 border border-amber-300"></span>
                          <span>текущая (не защищена)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded bg-green-50 border border-green-300"></span>
                          <span>текущая защищённая</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-300"></span>
                          <span>защищённая</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium">Легенда (бейджи статуса):</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-center w-12 px-2 py-0.5 rounded border bg-gray-100 border-gray-400">draft</span>
                          <span>черновик - есть ошибки</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-center w-12 px-2 py-0.5 rounded border bg-lime-100 border-lime-400">clean</span>
                          <span>черновик - ошибок нет</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-center w-12 px-2 py-0.5 rounded border">final</span>
                          <span>финальная версия готова к выгрузке</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </span>
              </div>

              {/* Пагинация: по 5 версий на страницу, с добивкой высоты */}
              {(() => {
                const total = versions.length;
                const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                const start = (page - 1) * PAGE_SIZE;
                const end = start + PAGE_SIZE;
                const pageItems = versions.slice(start, end);
                const remaining = Math.max(0, PAGE_SIZE - pageItems.length);
                // Добивка одной "сплошной" вставкой на высоту оставшихся строк +
                // зазоры МЕЖДУ ними (их remaining-1). Межстрочный зазор между
                // последней реальной строкой и добивкой даст сам <li> за счёт space-y-1.
                const fillerH = remaining > 0
                  ? (remaining * ROW_H + Math.max(0, remaining - 1) * GAP)
                  : 0;
                return (
                  <>
                    <ul className="mt-1 space-y-1 text-sm">
                      {pageItems.map(v => 
                        <li
                          key={v.id}
                          className={
                            "border rounded p-2 flex items-center gap-3 " +
                            (v.is_selected
                              ? (v.is_protected ? "bg-green-50 border-green-300" : "bg-amber-50 border-amber-300")
                              : (v.is_protected ? "bg-blue-50 border-blue-300" : ""))
                          }
                        >
                          <span className="flex items-center gap-1">
                            {v.is_selected ? <span aria-hidden className="w-4">➜</span> : <span aria-hidden className="w-4"></span>}
                            <span>#{v.id} • {new Date(v.created_at).toLocaleString()}</span>
                          </span>
                          {v.status && (
                            <span className={
                              "text-xs px-2 py-0.5 rounded border " +
                              (v.status==="draft" ? "bg-gray-100 border-gray-400" : "") +
                              (v.status==="clean" ? "bg-lime-100 border-lime-400" : "")
                            }>{v.status}</span>
                          )}
                          {v.is_protected ? <span className="text-xs px-2 py-0.5 rounded border bg-blue-100 border-blue-400">protected</span> : null}
                          {v.is_selected ? <span className="text-xs px-2 py-0.5 rounded border bg-amber-100 border-amber-400">текущая</span> : null}
                          <div className="ml-auto flex items-center gap-2">
                            {!v.is_selected && (
                              <button className="h-8 w-36 rounded-[var(--radius)] px-2 text-xs border"
                                      onClick={async ()=>{
                                        await fetch(`/api/documents/${versionsDocId}/versions/${v.id}/select`, { method: 'POST' });
                                        await loadVersions(String(versionsDocId!));
                                      }}>
                                Сделать текущей
                              </button>
                            )}
                            {v.status !== 'final' ? (
                              v.is_protected ? (
                                <button className="h-8 w-36 rounded-[var(--radius)] px-2 text-xs border"
                                        onClick={async ()=>{
                                          await fetch(`/api/documents/${versionsDocId}/versions/${v.id}/unfreeze`, { method: 'POST' });
                                          await loadVersions(String(versionsDocId!));
                                        }}>
                                  Снять защиту
                                </button>
                              ) : (
                                <button className="h-8 w-36 rounded-[var(--radius)] px-2 text-xs border"
                                        onClick={async ()=>{
                                          await fetch(`/api/documents/${versionsDocId}/versions/${v.id}/freeze`, { method: 'POST' });
                                          await loadVersions(String(versionsDocId!));
                                        }}>
                                  Защитить
                                </button>
                              )
                            ) : (
                              <button className="h-8 w-36 rounded-[var(--radius)] px-2 text-xs border" disabled>Защищена</button>
                            )}
                          </div>
                        </li>
                      )}
                      {!versions.length && <li className="text-zinc-500">Версий пока нет</li>}
                      {/* добивающий сплошной блок до фиксированной высоты страницы */}
                      {fillerH > 0 && (
                        <li aria-hidden
                            className="border rounded bg-white"
                            style={{ minHeight: fillerH }} />
                      )}
                    </ul>
                    {/* панель управления — показываем ВСЕГДА, кнопки могут быть неактивны */}
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <div className="text-zinc-500">Страница {page} из {totalPages}</div>
                      <div className="flex items-center gap-2">
                        <button
                          className="h-8 rounded-[var(--radius)] px-3 text-xs border disabled:opacity-50"
                          disabled={page <= 1}
                          onClick={()=> setPage(p => Math.max(1, p-1))}
                        >Назад</button>
                        <button
                          className="h-8 rounded-[var(--radius)] px-3 text-xs border disabled:opacity-50"
                          disabled={page >= totalPages}
                          onClick={()=> setPage(p => Math.min(totalPages, p+1))}
                        >Вперёд</button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Закрыть</button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
