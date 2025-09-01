import * as React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Docstore() {
  const [obj, setObj] = React.useState<{id:number; obj_uid:string} | null>(null);
  const [schemas, setSchemas] = React.useState<Array<{id:number; name:string; version?:string}>>([]);
  const [doc, setDoc] = React.useState<{id:number; doc_uid:string; status:string} | null>(null);
  const [payload, setPayload] = React.useState<string>("{}");
  const [versions, setVersions] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  async function createObject() {
    setErr(null);
    const r = await fetch("/api/objects/", { method: "POST" });
    if (!r.ok) { setErr(await r.text()); return; }
    setObj(await r.json());
  }

  async function loadSchemas() {
    const r = await fetch("/api/schemas");
    if (r.ok) setSchemas(await r.json());
  }
  React.useEffect(() => { loadSchemas(); }, []);

  async function createDocument(schemaId: number) {
    if (!obj) return;
    setErr(null);
    const r = await fetch(`/api/objects/${obj.id}/documents`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ schema_id: schemaId })
    });
    if (!r.ok) { setErr(await r.text()); return; }
    const body = await r.json();
    setDoc(body);
    await refreshVersions(body.id);
  }

  async function saveDraft() {
    if (!doc) return;
    setErr(null);
    let data: any;
    try { data = JSON.parse(payload); } catch (e:any) { setErr("payload: " + e?.message); return; }
    const r = await fetch(`/api/documents/${doc.id}/versions`, {
      method:"POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ payload: data })
    });
    if (!r.ok) { setErr(await r.text()); return; }
    await refreshVersions(doc.id);
  }

  async function refreshVersions(documentId: number) {
    const r = await fetch(`/api/documents/${documentId}/versions`);
    if (r.ok) setVersions(await r.json());
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>Создание объекта</CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button onClick={createObject}>Создать</Button>
          {obj && <div className="text-sm">ID: <code>{obj.id}</code> • UID: <code>{obj.obj_uid}</code></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Создание документа</CardHeader>
        <CardContent className="flex items-center gap-3">
          <select className="h-9 rounded-[var(--radius)] border px-2 text-sm" disabled={!obj}
                  onChange={(e) => createDocument(Number(e.target.value))} defaultValue="">
            <option value="" disabled>Выберите схему…</option>
            {schemas.map(s => <option key={s.id} value={s.id}>{s.name} {s.version ? `(v${s.version})` : ""}</option>)}
          </select>
          {doc && <div className="text-sm">Документ: <code>{doc.id}</code> • статус: <b>{doc.status}</b></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Сохранение черновика</CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <textarea className="w-full h-40 rounded-[var(--radius)] border p-2 font-mono text-sm"
                      value={payload} onChange={e=>setPayload(e.target.value)}/>
            <Button onClick={saveDraft} disabled={!doc}>Сохранить</Button>
          </div>
          <div className="mt-4 space-y-1 text-sm">
            {versions.map(v => (
              <div key={v.id} className="rounded-xl border p-2 flex items-center justify-between">
                <span>#{v.id} • {new Date(v.created_at).toLocaleString()}</span>
                <code className="truncate max-w-[60%]">{JSON.stringify(v.payload).slice(0,120)}…</code>
              </div>
            ))}
          </div>
          {err && <div className="mt-2 text-sm text-red-700">{err}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
