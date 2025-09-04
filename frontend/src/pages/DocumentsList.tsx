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
  const [versions, setVersions] = React.useState<Array<{id:number; created_at:string; payload:any}>>([]);
  const [versionsErr, setVersionsErr] = React.useState<string | null>(null);
  const [draftText, setDraftText] = React.useState<string>('{}');

  async function loadVersions(docId: number | string) {
    setVersionsErr(null);
    const r = await fetch(`/api/documents/${docId}/versions`);
    if (!r.ok) { setVersionsErr(await r.text()); setVersions([]); return; }
    setVersions(await r.json());
  }

  async function saveDraft(docId: number | string) {
    setVersionsErr(null);
    let payload: any;
    try { payload = JSON.parse(draftText); }
    catch (e:any) { setVersionsErr('Некорректный JSON: ' + (e?.message ?? e)); return; }
    const r = await fetch(`/api/documents/${docId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    });
    if (!r.ok) { setVersionsErr(await r.text()); return; }
    // перечитать список версий после сохранения
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
              <div className="text-sm">Сохранить черновик (JSON):</div>
              <textarea className="w-full h-40 border rounded p-2 font-mono text-sm"
                        value={draftText} onChange={(e)=>setDraftText(e.target.value)} />
              <div>
                <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black"
                        onClick={()=> versionsDocId != null && saveDraft(versionsDocId)}>
                  Сохранить черновик
                </button>
              </div>
              {versionsErr && <div className="text-sm text-red-700">{versionsErr}</div>}
              <div className="mt-3 text-sm font-medium">Список версий:</div>
              <ul className="mt-1 space-y-1 text-sm">
                {versions.map(v => (
                  <li key={v.id} className="border rounded p-2 flex items-center justify-between">
                    <span>#{v.id} • {new Date(v.created_at).toLocaleString()}</span>
                    <code className="truncate max-w-[60%]">{JSON.stringify(v.payload).slice(0,120)}…</code>
                  </li>
                ))}
                {!versions.length && <li className="text-zinc-500">Версий пока нет</li>}
              </ul>
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
