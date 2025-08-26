import * as React from "react";
import { DataTable } from "@/components/ui/data-table";
import { makeSchemaColumns, type SchemaRow } from "@/features/schemas/columns";
import { SchemaViewDialog } from "@/features/schemas/SchemaViewDialog";

export default function SchemasList() {
  const [data, setData] = React.useState<SchemaRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [viewId, setViewId] = React.useState<number | string | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);
  const columns = React.useMemo(
    () => makeSchemaColumns({
      onView: (id) => { setViewId(id); setViewOpen(true); }
    }),
    []
  ); 
  React.useEffect(() => {
    fetch("/api/schemas")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((items) => setData(items))
      .catch((e) => setErr(String(e)));
  }, []);
  if (err) return <div className="p-6 text-red-700">Ошибка: {err}</div>;
  if (!data) return <div className="p-6">Загрузка…</div>;
  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={data}
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
    </div>
  );
}
