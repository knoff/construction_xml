import * as React from "react";
import { DataTable } from "@/components/ui/data-table";
import { makeSchemaColumns, type SchemaRow } from "@/features/schemas/columns";
import { SchemaViewDialog } from "@/features/schemas/SchemaViewDialog";
import { SchemaEditDialog } from "@/features/schemas/SchemaEditDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/ui/upload-dialog";

export default function SchemasList() {
  const [data, setData] = React.useState<SchemaRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [viewId, setViewId] = React.useState<number | string | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<number | string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  async function reload() {
    const r = await fetch("/api/schemas");
    if (!r.ok) throw new Error(await r.text());
    setData(await r.json());
  }

  const columns = React.useMemo(() => makeSchemaColumns({
    onView: (id) => { setViewId(id); setViewOpen(true); },
    onEdit: (id) => { setEditId(id); setEditOpen(true); },
    onDelete: (row) => {
      setConfirmDeleteId(row.id);
      setConfirmDeleteName(row.name ?? null);
      setConfirmOpen(true);
    },
  }), []);


  React.useEffect(() => { reload().catch((e) => setErr(String(e))); }, [])

  if (err) return <div className="p-6 text-red-700">Ошибка: {err}</div>;
  if (!data) return <div className="p-6">Загрузка…</div>;
  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={data}
        rightActions={
          <Button onClick={() => setUploadOpen(true)}>
            Загрузить схему
          </Button>
        }
        initialVisibility={{
          id: false,
          namespace: false,
          file_path: false,
          "type_code": false
        }}
        initialSizing={{
          name: 180,
          version: 70,
          type_title: 180,
          description: 260,
          created_at: 180,
          id: 80,
          namespace: 180,
          file_path: 320,
          type_code: 180,
          actions: 64
        }}
        initialPageSize={10}
      />

      {/* Диалог просмотра */}
      <SchemaViewDialog
        open={viewOpen}
        schemaId={viewId}
        onOpenChange={(o) => { if (!o) setViewId(null); setViewOpen(o); }}
      />


      <SchemaEditDialog
        open={editOpen}
        schemaId={editId}
        onOpenChange={(o) => { if (!o) setEditId(null); setEditOpen(o); }}
        onSaved={async () => { await reload(); }}
      />

      {/* Подтверждение удаления — обычный Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setConfirmDeleteId(null);  setConfirmDeleteName(null);}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить XSD схему?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="text-base text-center">
              Действие необратимо. Будет удалена схема
              {confirmDeleteName
                ? <> «<b>{confirmDeleteName}</b>»</>
                : <> с ID: <b>{String(confirmDeleteId ?? "")}</b></>}
              .
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button>
            </DialogClose>
            <button
              className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-red-600 hover:bg-red-700"
              onClick={async () => {
                const id = confirmDeleteId;
                setConfirmOpen(false);
                setConfirmDeleteId(null);
                setConfirmDeleteName(null);
                if (id == null) return;
                const r = await fetch(`/api/schemas/${id}/delete`, { method: "POST" });
                if (!r.ok) { alert(await r.text()); return; }
                await reload();
              }}
            >
              Удалить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог загрузки — автo-открытие «Изменить» после успеха */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title="Загрузка XSD-схемы"
        accept=".xsd"
        multiple={false}
        mime={["text/xml","application/xml"]}
        maxSizeBytes={80 * 1024 * 1024}
        requirements={
          <>
            <div>Допустимые расширения: <b>.xsd</b></div>
            <div>Допустимые MIME: <code>text/xml</code>, <code>application/xml</code></div>
            <div>Максимальный размер: <b>80 МБ</b></div>
          </>
        }
        onUpload={async ([file]) => {
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch("/api/schemas/upload", { method: "POST", body: fd });
          if (!r.ok) throw new Error(await r.text());
          const body = await r.json(); // {"saved":true,"schema":{...}}
          // обновим список и откроем редактирование новой записи
          const rr = await fetch("/api/schemas");
          const items = await rr.json();
          setData(items);
          setUploadOpen(false);
          const newId = body?.schema?.id;
          if (newId != null) {
            setEditId(newId);
            setEditOpen(true);
          }
        }}
        primaryLabel="Загрузить"
      />
    </div>
  );
}
