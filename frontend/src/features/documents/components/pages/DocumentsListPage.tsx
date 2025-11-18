import * as React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";

import { makeDocumentColumns } from "@/features/documents/components/DocumentsTable";
import { useDocumentsListPage } from "@/features/documents/runtime/useDocumentsListPage";

export default function DocumentsListPage() {
  const {
    data,
    error,
    isLoading,
    createDialog,
    viewDialog,
    editDialog,
    deleteDialog,
    versionsDialog,
    objects,
    schemas,
    columns,
    setCreateOpen,
    setCreateObj,
    setCreateSchema,
    handleCreate,
    setViewOpen,
    setEditOpen,
    setConfirmOpen,
    setEditObj,
    handleEdit,
    handleDelete,
    setVersionsOpen,
    setDraftText,
    saveCurrent,
    loadVersions,
    pagination,
    versionsState,
  } = useDocumentsListPage();

  if (error) return <div className="p-6 text-red-700">Ошибка: {error}</div>;
  if (isLoading || !data) return <div className="p-6">Загрузка…</div>;

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
          actions: 64,
        }}
        initialVisibility={{ id: false, updated_at: false }}
        initialPageSize={10}
      />

      <Dialog open={createDialog.open} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать документ</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div>
              <div className="text-sm mb-1">Объект</div>
              <select
                className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                value={createDialog.objectId}
                onChange={(e) => setCreateObj(Number(e.target.value))}
              >
                <option value="">— выберите объект —</option>
                {objects.map((o) => (
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
                value={createDialog.schemaId}
                onChange={(e) => setCreateSchema(Number(e.target.value))}
              >
                <option value="">— выберите схему —</option>
                {schemas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.version ? ` (v${s.version})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button>
            </DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black" onClick={handleCreate}>
              Создать
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialog.open} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Просмотр документа</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <pre className="text-xs bg-zinc-50 rounded-xl p-3 overflow-auto">{viewDialog.content}</pre>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Закрыть</button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog.open} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Статус документа</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div>
              <div className="text-sm mb-1">Статус</div>
              <div className="flex items-center gap-2">
                <button className="h-9 rounded-[var(--radius)] px-3 text-sm border" onClick={() => handleEdit("draft")}>
                  draft
                </button>
                <button className="h-9 rounded-[var(--radius)] px-3 text-sm border" onClick={() => handleEdit("final")}>
                  final
                </button>
              </div>
            </div>
            <div>
              <div className="text-sm mb-1">Объект</div>
              <select
                className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                value={editDialog.objectId || ""}
                onChange={(e) => setEditObj(Number(e.target.value))}
              >
                <option value="">— выберите объект —</option>
                {objects.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button>
            </DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black" onClick={handleEdit}>
              Сохранить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog.open} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить документ?</DialogTitle>
          </DialogHeader>
          <DialogBody>Действие необратимо.</DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-9 rounded-[var(--radius)] border px-3 text-sm">Отмена</button>
            </DialogClose>
            <button className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Удалить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={versionsDialog.open} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Версии документа</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-2">
              <div className="text-sm">Сохранить (JSON текущей версии):</div>
              {versionsDialog.currentVersion}
              <div>
                <button
                  className="h-9 rounded-[var(--radius)] px-3 text-sm text-white bg-black disabled:opacity-50"
                  onClick={() => saveCurrent()}
                  disabled={versionsDialog.isCurrentFinal}
                >
                  Сохранить
                </button>
              </div>
              {versionsState.error && <div className="text-sm text-red-700">{versionsState.error}</div>}
              {versionsDialog.tooltip}
              {versionsDialog.list}
              {versionsDialog.pagination}
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
            <DialogClose asChild><button className="h-9 rounded-[var(--radius)] border px-3 text-sm text-white bg-black">Закрыть</button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
