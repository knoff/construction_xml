import * as React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";

import { makeDocumentColumns, type DocumentRow } from "@/features/documents/components/DocumentsTable";

type DocumentSummary = {
  id: number;
  doc_uid?: string | null;
  status: string;
  object?: { id: number; name: string } | null;
  schema?: { id: number; name: string; version?: string | null } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DocumentDetails = DocumentSummary & {
  payload?: any;
  latest_version_id?: number | null;
};

type DocumentVersion = {
  id: number;
  payload: any;
  created_at?: string | null;
  status?: string | null;
  is_protected?: boolean | null;
  is_selected?: boolean | null;
};

type ObjectOption = { id: number; name: string };
type SchemaOption = { id: number; name: string; version?: string | null };

type VersionsState = {
  loading: boolean;
  error: string | null;
  items: DocumentVersion[];
  docId: number | null;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 10;

export default function DocumentsListPage() {
  const {
    documentsQuery,
    objectsQuery,
    schemasQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    documentDetails,
    documentVersions,
    documentVersion,
    createVersionMutation,
  } = useDocumentsListPage();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createObj, setCreateObj] = React.useState<number | "">("");
  const [createSchema, setCreateSchema] = React.useState<number | "">("");
  const [createError, setCreateError] = React.useState<string | null>(null);

  const [viewOpen, setViewOpen] = React.useState(false);
  const [viewDoc, setViewDoc] = React.useState<DocumentDetails | null>(null);
  const [viewError, setViewError] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editDoc, setEditDoc] = React.useState<DocumentSummary | null>(null);
  const [editObj, setEditObj] = React.useState<number | "">("");
  const [editError, setEditError] = React.useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteDoc, setDeleteDoc] = React.useState<DocumentSummary | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versionsState, setVersionsState] = React.useState<VersionsState>({ loading: false, error: null, items: [], docId: null });
  const [draftText, setDraftText] = React.useState<string | null>(null);

  const documents = documentsQuery.data ?? [];
  const objectOptions = objectsQuery.data ?? [];
  const schemaOptions = schemasQuery.data ?? [];

  const tableData = React.useMemo<DocumentRow[]>(
    () =>
      documents.map((doc) => ({
        id: doc.id,
        status: doc.status === "final" ? "final" : "draft",
        object: doc.object ? { id: doc.object.id, name: doc.object.name ?? "" } : undefined,
        schema: doc.schema
          ? { id: doc.schema.id, name: doc.schema.name ?? "", version: doc.schema.version ?? undefined }
          : undefined,
        created_at: doc.created_at ?? undefined,
        updated_at: doc.updated_at ?? undefined,
      })),
    [documents],
  );

  const handleViewDocument = React.useCallback(
    async (id: number | string) => {
      setViewOpen(true);
      setViewDoc(null);
      setViewError(null);
      try {
        const details = await documentDetails(id);
        setViewDoc(details);
      } catch (error) {
        const message = (error as Error)?.message ?? "Не удалось загрузить документ";
        setViewError(message);
      }
    },
    [documentDetails],
  );

  const handleEditDocument = React.useCallback(
    (id: number | string) => {
      const doc = documents.find((item) => item.id === id) ?? null;
      setEditDoc(doc);
      setEditObj(doc?.object?.id ?? "");
      setEditOpen(true);
      setEditError(null);
    },
    [documents],
  );

  const handleDeleteDocument = React.useCallback(
    (row: DocumentRow) => {
      const doc = documents.find((item) => String(item.id) === String(row.id)) ?? null;
      setDeleteDoc(doc);
      setDeleteOpen(true);
      setDeleteError(null);
    },
    [documents],
  );

  const handleFillDocument = React.useCallback((id: number | string) => {
    window.location.href = `/documents/${id}/fill`;
  }, []);

  const refreshVersions = React.useCallback(
    async (docId: number) => {
      setVersionsState({ loading: true, error: null, items: [], docId });
      try {
        const list: DocumentVersion[] = await documentVersions(docId);
        setVersionsState({ loading: false, error: null, items: list, docId });
        const current = list.find((version) => version.is_selected);
        setDraftText(current ? JSON.stringify(current.payload, null, 2) : null);
      } catch (error) {
        const message = (error as Error)?.message ?? "Не удалось загрузить версии";
        setVersionsState({ loading: false, error: message, items: [], docId });
      }
    },
    [documentVersions],
  );

  const handleOpenVersions = React.useCallback(
    async (id: number | string) => {
      const numericId = Number(id);
      if (Number.isNaN(numericId)) return;
      setVersionsOpen(true);
      await refreshVersions(numericId);
    },
    [refreshVersions],
  );

  const columns = React.useMemo(
    () =>
      makeDocumentColumns({
        onView: handleViewDocument,
        onEdit: handleEditDocument,
        onDelete: handleDeleteDocument,
        onFill: handleFillDocument,
        onVersions: handleOpenVersions,
      }),
    [handleDeleteDocument, handleEditDocument, handleFillDocument, handleOpenVersions, handleViewDocument],
  );

  async function handleCreateSubmit() {
    setCreateError(null);
    if (!createObj || !createSchema) {
      setCreateError("Необходимо выбрать объект и схему");
      return;
    }
    try {
      await createMutation.mutateAsync({ object_id: Number(createObj), schema_id: Number(createSchema) });
      setCreateOpen(false);
      setCreateObj("");
      setCreateSchema("");
    } catch (error) {
      const message = (error as Error)?.message ?? "Не удалось создать документ";
      setCreateError(message);
    }
  }

  async function handleEditSubmit(status?: string) {
    if (!editDoc) return;
    setEditError(null);
    try {
      const payload: Partial<{ object_id: number; schema_id: number; status: string }> = {};
      if (status) payload.status = status;
      if (editObj) payload.object_id = Number(editObj);

      await updateMutation.mutateAsync({ id: editDoc.id, payload });
      setEditOpen(false);
      setEditDoc(null);
    } catch (error) {
      const message = (error as Error)?.message ?? "Не удалось обновить документ";
      setEditError(message);
    }
  }

  async function handleDeleteSubmit() {
    if (!deleteDoc) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteDoc.id);
      setDeleteOpen(false);
      setDeleteDoc(null);
    } catch (error) {
      const message = (error as Error)?.message ?? "Не удалось удалить документ";
      setDeleteError(message);
    }
  }

  async function saveCurrentVersion() {
    if (!versionsState.docId || draftText == null) return;
    try {
      const payload = JSON.parse(draftText);
      await createVersionMutation.mutateAsync({ documentId: versionsState.docId, payload });
      await refreshVersions(versionsState.docId);
    } catch (error) {
      const message = (error as Error)?.message ?? "Не удалось сохранить версию";
      setVersionsState((prev) => ({ ...prev, error: message }));
    }
  }

  async function loadVersionPayload(versionId: number) {
    if (!versionsState.docId) return;
    try {
      const version = await documentVersion(versionsState.docId, versionId);
      setDraftText(JSON.stringify(version.payload, null, 2));
    } catch (error) {
      const message = (error as Error)?.message ?? "Не удалось загрузить версию";
      setVersionsState((prev) => ({ ...prev, error: message }));
    }
  }

  if (documentsQuery.isError) {
    return <div className="p-6 text-red-700">Ошибка: {documentsQuery.error?.message ?? "Не удалось загрузить документы"}</div>;
  }

  if (documentsQuery.isPending) {
    return <div className="p-6">Загрузка…</div>;
  }

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={tableData}
        rightActions={<Button onClick={() => setCreateOpen(true)}>Новый документ</Button>}
        initialVisibility={{ id: false, updated_at: false }}
        initialSizing={{
          object_name: 340,
          schema_name: 180,
          schema_version: 70,
          status: 120,
          created_at: 160,
          updated_at: 160,
          id: 64,
          actions: 80,
        }}
        initialPageSize={INITIAL_PAGE_SIZE}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать документ</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <div className="text-sm mb-1">Объект</div>
                <select
                  className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                  value={createObj}
                  onChange={(e) => setCreateObj(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">— выберите объект —</option>
                  {objectOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm mb-1">Схема</div>
                <select
                  className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                  value={createSchema}
                  onChange={(e) => setCreateSchema(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">— выберите схему —</option>
                  {schemaOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.version ? ` (v${s.version})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {createError && <div className="text-sm text-red-700 whitespace-pre-wrap">{createError}</div>}
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button>
            </DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black" onClick={handleCreateSubmit}>
              Создать
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) {
            setViewDoc(null);
            setViewError(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Просмотр документа</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {viewError ? (
              <div className="text-sm text-red-700 whitespace-pre-wrap">{viewError}</div>
            ) : viewDoc ? (
              <pre className="text-xs bg-zinc-50 rounded-xl p-3 overflow-auto">{JSON.stringify(viewDoc, null, 2)}</pre>
            ) : (
              <div className="text-sm">Загрузка…</div>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Закрыть</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditDoc(null); setEditObj(""); setEditError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Статус документа</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <div className="text-sm mb-1">Статус</div>
                <div className="flex items-center gap-2">
                  <button className="h-9 rounded-[var(--radius)] px-3 text-sm border" onClick={() => handleEditSubmit("draft")}>
                    draft
                  </button>
                  <button className="h-9 rounded-[var(--radius)] px-3 text-sm border" onClick={() => handleEditSubmit("final")}>
                    final
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm mb-1">Объект</div>
                <select
                  className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                  value={editObj}
                  onChange={(e) => setEditObj(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">— выберите объект —</option>
                  {objectOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              {editError && <div className="text-sm text-red-700 whitespace-pre-wrap">{editError}</div>}
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button>
            </DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black" onClick={() => handleEditSubmit()}>
              Сохранить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) { setDeleteDoc(null); setDeleteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить документ?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            Действие необратимо. Документ {deleteDoc ? <b>{deleteDoc.doc_uid ?? deleteDoc.id}</b> : null} будет удалён.
            {deleteError && <div className="mt-2 text-sm text-red-700 whitespace-pre-wrap">{deleteError}</div>}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button>
            </DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-red-600 hover:bg-red-700" onClick={handleDeleteSubmit}>
              Удалить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={versionsOpen}
        onOpenChange={(open) => {
          setVersionsOpen(open);
          if (!open) {
            setVersionsState({ loading: false, error: null, items: [], docId: null });
            setDraftText(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Версии документа</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {versionsState.loading ? (
              <div className="text-sm">Загрузка…</div>
            ) : (
              <div className="space-y-4">
                {versionsState.error && <div className="text-sm text-red-700 whitespace-pre-wrap">{versionsState.error}</div>}
                <div>
                  <div className="text-sm font-medium mb-2">JSON текущей версии</div>
                  <textarea
                    className="w-full min-h-[200px] border rounded-xl p-2 text-xs font-mono"
                    value={draftText ?? ""}
                    onChange={(e) => setDraftText(e.target.value)}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" onClick={saveCurrentVersion} disabled={!draftText}>
                      Сохранить как новую версию
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">История версий</div>
                  <div className="space-y-2">
                    {versionsState.items.length === 0 ? (
                      <div className="text-sm text-zinc-500">Версий пока нет</div>
                    ) : (
                      versionsState.items.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-xl p-3 text-sm flex items-center justify-between ${item.is_selected ? "bg-emerald-50 border-emerald-200" : ""}`}
                        >
                          <div className="flex flex-col gap-1">
                            <div>
                              <b># {item.id}</b> {item.status ? <span className="ml-2 text-xs uppercase">{item.status}</span> : null}
                            </div>
                            <div className="text-xs text-zinc-500">{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => loadVersionPayload(item.id)}>
                              Загрузить JSON
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Закрыть</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
