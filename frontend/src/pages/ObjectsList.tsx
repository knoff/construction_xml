import * as React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { makeObjectColumns, type ObjectRow } from "@/features/objects/columns";

export default function ObjectsList() {
  const [data, setData] = React.useState<ObjectRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [viewId, setViewId] = React.useState<number | string | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<number | string | null>(null);
  const [confirmName, setConfirmName] = React.useState<string | null>(null);
  const [confirmDocsCount, setConfirmDocsCount] = React.useState<number>(0);
  const [confirmDeleteDocs, setConfirmDeleteDocs] = React.useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);

  async function reload() {
    const r = await fetch("/api/objects/");
    if (!r.ok) throw new Error(await r.text());
    setData(await r.json());
  }
  React.useEffect(() => { reload().catch(e=>setErr(String(e))); }, []);

  const columns = React.useMemo(() => makeObjectColumns({
    onView: (id) => { setViewId(id); setViewOpen(true); },
    onEdit: (id) => { setEditId(id); setEditOpen(true); },
    onDelete: async (row) => {
      setConfirmId(row.id); setConfirmName(row.name ?? null); setConfirmOpen(true);
      setConfirmDeleteDocs(false);
      try {
        const r = await fetch(`/api/objects/${row.id}/documents/count`);
        if (r.ok) {
          const j = await r.json();
          setConfirmDocsCount(Number(j?.count ?? 0));
        } else {
          setConfirmDocsCount(0);
        }
      } catch { setConfirmDocsCount(0); }
    },
  }), []);

  if (err) return <div className="p-6 text-red-700">Ошибка: {err}</div>;
  if (!data) return <div className="p-6">Загрузка…</div>;

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={data}
        rightActions={<Button onClick={() => setCreateOpen(true)}>Новый объект</Button>}
        initialSizing={{
          name: 340,
          created_at: 160,
          id: 64,
          obj_uid: 350,
          actions: 64
        }}
        initialVisibility={{ id: false, obj_uid: true }}
        initialPageSize={10}
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новый объект</DialogTitle></DialogHeader>
          <DialogBody>
            <input ref={nameRef} className="w-full h-9 rounded-[var(--radius)] border px-3 text-sm" placeholder="Название" />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button></DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black"
              onClick={async () => {
                const name = nameRef.current?.value?.trim(); if (!name) return;
                const r = await fetch("/api/objects/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
                if (!r.ok) { alert(await r.text()); return; }
                setCreateOpen(false); await reload();
              }}>Создать</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog (минимальный, можно расширить позже) */}
      <Dialog open={viewOpen} onOpenChange={(o)=>{ setViewOpen(o); if(!o) setViewId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Просмотр объекта</DialogTitle></DialogHeader>
          <DialogBody>
            <pre className="text-xs bg-zinc-50 rounded-xl p-3 overflow-auto">{JSON.stringify(data.find(d=>d.id===viewId), null, 2)}</pre>
          </DialogBody>
          <DialogFooter><DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Закрыть</button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o)=>{ setEditOpen(o); if(!o) setEditId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать объект</DialogTitle></DialogHeader>
          <DialogBody>
            <input defaultValue={data.find(d=>d.id===editId)?.name ?? ""} id="edit-name" className="w-full h-9 rounded-[var(--radius)] border px-3 text-sm" />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button></DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black"
              onClick={async () => {
                const el = document.getElementById("edit-name") as HTMLInputElement;
                const r = await fetch(`/api/objects/${editId}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ name: el.value }) });
                if (!r.ok) { alert(await r.text()); return; }
                setEditOpen(false); await reload();
              }}>Сохранить</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmOpen} onOpenChange={(o)=>{ setConfirmOpen(o); if(!o){ setConfirmId(null); setConfirmName(null); setConfirmDocsCount(0); setConfirmDeleteDocs(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Удалить объект?</DialogTitle></DialogHeader>
          <DialogBody>
            <div>Действие необратимо. Будет удалён объект {confirmName ? <>«<b>{confirmName}</b>»</> : <>ID: <b>{String(confirmId ?? "")}</b></>}.</div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={confirmDeleteDocs} onChange={(e)=>setConfirmDeleteDocs(e.target.checked)} />
              Также удалить связанные документы{confirmDocsCount ? <> (<b>{confirmDocsCount}</b>)</> : null}
            </label>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button></DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-red-600 hover:bg-red-700"
              onClick={async () => {
                const id = confirmId; setConfirmOpen(false); setConfirmId(null); setConfirmName(null);
                if (id == null) return;
                const url = `/api/objects/${id}?delete_documents=${confirmDeleteDocs ? "true" : "false"}`;
                const r = await fetch(url, { method: "DELETE" });
                if (!r.ok && r.status !== 204) { alert(await r.text()); return; }
                await reload();
              }}>Удалить</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
