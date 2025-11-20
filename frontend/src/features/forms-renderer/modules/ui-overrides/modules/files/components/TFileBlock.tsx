import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import { getAtPath } from "@/features/forms-renderer/core/utils/path";
import { useFormStateController } from "@/features/forms-renderer/modules/renderer/runtime/contexts";
import { useDocumentMeta } from "@/features/documents";
import { BlockRow, ValueLinkMatches, ValueLinkStatusBadge } from "@/features/forms-renderer/modules/ui-overrides/components";
import { SelectFileDialog } from "./dialogs/SelectFileDialog";
import { UploadDialog } from "@/features/files/components/UploadDialog";
import { useValueLinks, useValueLinkStatus } from "@/features/forms-renderer/hooks/useValueLinks";

const OBJECT_FILES_CACHE = new Map<number, { items: ObjectFileSummary[]; fetchedAt: number }>();
const CACHE_TTL = 30_000;

type FileVersion = {
  id: number;
  original_name?: string | null;
  mime?: string | null;
  size?: number | null;
  sha256?: string | null;
  crc32?: string | null;
  storage_path?: string | null;
};

type FileEntity = {
  id: number;
  object_id?: number | null;
  title?: string | null;
  doc_number?: string | null;
  doc_date?: string | null;
  author?: string | null;
  doc_type?: string | null;
  group?: string | null;
  version?: FileVersion | null;
};

type ObjectFileSummary = {
  id: number;
  original_name?: string | null;
  mime?: string | null;
  size?: number | null;
  sha256?: string | null;
  crc32?: string | null;
  storage_path?: string | null;
};

type TFileBlockProps = {
  path: (string | number)[];
  childrenFields: FieldModel[];
  renderChild: (child: FieldModel, childPath: (string | number)[]) => React.ReactNode;
};

export function TFileBlock(props: TFileBlockProps) {
  const { path, childrenFields, renderChild } = props;
  const { state, setPath, delPath } = useFormStateController<any>();
  const docMeta = useDocumentMeta();
  const valueLinks = useValueLinks();

  const [selectOpen, setSelectOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState<string | null>(null);
  const [entity, setEntity] = React.useState<FileEntity | null>(null);
  const [loadingEntity, setLoadingEntity] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteErr, setDeleteErr] = React.useState<string | null>(null);

  const fileName = React.useMemo(() => getAtPath(state, [...path, "FileName"]), [state, path]);
  const fileFormat = React.useMemo(() => getAtPath(state, [...path, "FileFormat"]), [state, path]);
  const fileChecksum = React.useMemo(() => getAtPath(state, [...path, "FileChecksum"]), [state, path]);
  const checksumPath = React.useMemo<(string | number)[]>(() => [...path, "FileChecksum"], [path]);
  const mappingKey = React.useMemo(() => valueLinks.buildKey(checksumPath), [valueLinks, checksumPath]);
  const linkStatus = useValueLinkStatus(checksumPath);

  const normalizedChecksum = normalizeCrc(fileChecksum);
  const canCheckLinks = Boolean(mappingKey && normalizedChecksum);
  const checkingLinks = linkStatus?.state === "loading";

  const handleCheckLinks = React.useCallback(async () => {
    if (!mappingKey) return;
    await valueLinks.check(checksumPath, normalizedChecksum ?? fileChecksum ?? null);
  }, [mappingKey, valueLinks, checksumPath, normalizedChecksum, fileChecksum]);

  const mainFields = React.useMemo(() => childrenFields.filter((child) => child?.name !== "SignFile"), [childrenFields]);
  const signField = React.useMemo(() => childrenFields.find((child) => child?.name === "SignFile"), [childrenFields]);

  const diff = React.useMemo(() => {
    if (!entity?.version) return null;
    const version = entity.version;
    const versionFormat = normalizeString(guessFormat(version))?.toLowerCase();
    const formFormat = normalizeString(fileFormat)?.toLowerCase();
    return {
      name: normalizeString(version.original_name) !== normalizeString(fileName),
      format: versionFormat !== formFormat,
      checksum: normalizeCrc(version.crc32) !== normalizedChecksum,
    };
  }, [entity, fileName, fileFormat, normalizedChecksum]);

  React.useEffect(() => {
    if (entity || !docMeta?.objectId || !normalizedChecksum) return;
    let cancelled = false;
    setLoadingEntity(true);
    loadObjectFiles(docMeta.objectId)
      .then((items) => {
        if (cancelled) return;
        const match = items.find((item) => normalizeCrc(item.crc32) === normalizedChecksum);
        if (match) {
          loadEntity(match.id, false).catch((err) => {
            if (!cancelled) setError(err instanceof Error ? err.message : String(err));
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingEntity(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entity, docMeta?.objectId, normalizedChecksum]);

  const loadEntity = React.useCallback(
    async (fileId: number, writeFields: boolean) => {
      setLoadingEntity(true);
      setError(null);
      try {
        const response = await fetch(`/api/files/${fileId}`);
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data: FileEntity = await response.json();
        setEntity(data);
        if (writeFields) {
          applyEntityToFields(data, path, setPath, delPath);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingEntity(false);
      }
    },
    [path, setPath, delPath],
  );

  const applyEntity = React.useCallback(
    async (fileId: number, writeFields: boolean) => {
      await loadEntity(fileId, writeFields);
    },
    [loadEntity],
  );

  const handleSelectFile = React.useCallback(
    async (fileId: number) => {
      await applyEntity(fileId, true);
      setSelectOpen(false);
    },
    [applyEntity],
  );

  const handleUpload = React.useCallback(
    async ([file]: File[]) => {
      if (!docMeta?.objectId) {
        throw new Error("Сначала выберите объект для документа");
      }
      setUploadErr(null);
      const fd = new FormData();
      fd.append("object_id", String(docMeta.objectId));
      fd.append("f", file);
      const response = await fetch("/api/files", { method: "POST", body: fd });
      if (!response.ok) {
        const text = await response.text();
        setUploadErr(text || `HTTP ${response.status}`);
        throw new Error(text || `HTTP ${response.status}`);
      }
      const created = await response.json();
      await applyEntity(created?.id ?? created?.file_id, true);
      setUploadOpen(false);
    },
    [docMeta?.objectId, applyEntity],
  );

  const canOperateWithFiles = Boolean(docMeta?.objectId);
  const manualFieldsVisible = !entity;

  const clearFileFields = React.useCallback(() => {
    delPath([...path, "FileName"]);
    delPath([...path, "FileFormat"]);
    delPath([...path, "FileChecksum"]);
    delPath([...path, "FileRelativePath"]);
  }, [delPath, path]);

  const handleDetach = React.useCallback(() => {
    clearFileFields();
    setEntity(null);
  }, [clearFileFields]);

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!entity) return;
    setDeleting(true);
    setDeleteErr(null);
    try {
      const response = await fetch(`/api/files/${entity.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error((await response.text()) || `HTTP ${response.status}`);
      }
      if (docMeta?.objectId) {
        const cached = OBJECT_FILES_CACHE.get(docMeta.objectId);
        if (cached) {
          OBJECT_FILES_CACHE.set(docMeta.objectId, {
            items: cached.items.filter((item) => item.id !== entity.id),
            fetchedAt: cached.fetchedAt,
          });
        }
      }
      clearFileFields();
      setEntity(null);
      setDeleteDialogOpen(false);
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }, [entity, docMeta?.objectId, clearFileFields]);

  const openDeleteDialog = React.useCallback(() => {
    setDeleteErr(null);
    setDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = React.useCallback(() => {
    if (deleting) return;
    setDeleteDialogOpen(false);
    setDeleteErr(null);
  }, [deleting]);

  const formatFromVersion = React.useMemo(() => {
    if (!entity?.version) return undefined;
    return normalizeString(guessFormat(entity.version))?.toLowerCase();
  }, [entity?.version]);

  const objectBindingLine = docMeta?.objectName
    ? `Файл будет привязан к объекту «${docMeta.objectName}».`
    : "Файл будет привязан к выбранному объекту.";

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Связанный файл</div>
          {entity ? (
            <div className="text-xs text-zinc-500">ID #{entity.id}</div>
          ) : (
            <div className="text-xs text-zinc-500">Файл не выбран</div>
          )}
          {!canOperateWithFiles && (
            <div className="mt-1 text-xs text-amber-600">
              Привяжите документ к объекту, чтобы выбрать или загрузить файл.
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ValueLinkStatusBadge status={linkStatus} available={Boolean(mappingKey)} />
          <button
            type="button"
            className="h-8 rounded-[var(--radius)] border px-3 text-sm disabled:opacity-50"
            onClick={handleCheckLinks}
            disabled={!canCheckLinks || checkingLinks}
          >
            {checkingLinks ? "Проверка…" : "Проверить совпадения"}
          </button>
          <button
            type="button"
            className="h-8 rounded-[var(--radius)] border px-3 text-sm disabled:opacity-50"
            onClick={() => setSelectOpen(true)}
            disabled={!canOperateWithFiles || loadingEntity || deleting}
          >
            Выбрать файл
          </button>
          <button
            type="button"
            className="h-8 rounded-[var(--radius)] border px-3 text-sm disabled:opacity-50"
            onClick={() => setUploadOpen(true)}
            disabled={!canOperateWithFiles || loadingEntity || deleting}
          >
            Загрузить
          </button>
          {entity && (
            <button
              type="button"
              className="h-8 rounded-[var(--radius)] border px-3 text-sm"
              onClick={handleDetach}
              disabled={loadingEntity || deleting}
            >
              Отвязать
            </button>
          )}
          {entity && (
            <button
              type="button"
              className="h-8 rounded-[var(--radius)] border border-red-200 px-3 text-sm text-red-600 disabled:opacity-50"
              onClick={openDeleteDialog}
              disabled={loadingEntity || deleting}
            >
              Удалить
            </button>
          )}
        </div>
      </header>

      {(loadingEntity || deleting) && (
        <div className="rounded border border-dashed p-3 text-sm text-zinc-500">
          {deleting ? "Удаление файла…" : "Загрузка сведений о файле…"}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {entity?.version && (
        <div className="rounded border bg-zinc-50 p-3 text-sm">
          <div className="font-medium">Данные из выбранного файла</div>
          <dl className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <InfoRow label="Имя файла" value={entity.version.original_name} mismatch={diff?.name} />
            <InfoRow label="Формат" value={formatFromVersion} mismatch={diff?.format} />
            <InfoRow label="CRC32" value={normalizeCrc(entity.version.crc32)} mismatch={diff?.checksum} />
          </dl>
        </div>
      )}

      {mappingKey && linkStatus && linkStatus.matches.length > 0 && (
        <ValueLinkMatches matches={linkStatus.matches} status={linkStatus.state} />
      )}

      {manualFieldsVisible && (
        <BlockRow
          path={path}
          childrenFields={mainFields}
          renderChild={(child, childPath) => renderChild(child, childPath)}
          fixedCols={2}
        />
      )}

      {signField ? (
        <div className="pt-2">{renderChild(signField, [...path, signField.name as string])}</div>
      ) : null}

      <SelectFileDialog
        open={selectOpen}
        onOpenChange={setSelectOpen}
        objectId={docMeta?.objectId ?? undefined}
        onSelect={(file) => handleSelectFile(file.id)}
      />

      {uploadOpen && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={(v) => {
            if (!v) {
              setUploadOpen(false);
              setUploadErr(null);
            }
          }}
          title="Загрузка файла"
          accept=".pdf"
          multiple={false}
          mime={["application/pdf"]}
          maxSizeBytes={80 * 1024 * 1024}
          requirements={
            <>
              <div>Допустимые расширения: <b>.pdf</b></div>
              <div>Допустимый MIME: <code>application/pdf</code></div>
              <div>Максимальный размер: <b>80 МБ</b></div>
              <div>{objectBindingLine}</div>
              {uploadErr && <div className="mt-2 text-sm text-red-600 whitespace-pre-wrap">{uploadErr}</div>}
            </>
          }
          onUpload={handleUpload}
          primaryLabel="Загрузить"
        />
      )}

      {deleteDialogOpen && entity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-[460px] rounded bg-white p-4 shadow-lg">
            <div className="mb-2 text-lg font-semibold">Удалить файл?</div>
            <div className="text-sm">
              Файл <b>{entity.version?.original_name ?? `#${entity.id}`}</b> будет помечен как удалённый и удалён из хранилища.
            </div>
            {deleteErr && <div className="mt-2 text-sm text-red-600 whitespace-pre-wrap">{deleteErr}</div>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="h-8 rounded-[var(--radius)] px-3 border" onClick={closeDeleteDialog} disabled={deleting}>
                Отмена
              </button>
              <button
                className="h-8 rounded-[var(--radius)] px-3 border text-red-700 disabled:opacity-50"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeCrc(value: unknown): string | undefined {
  if (!value) return undefined;
  const text = String(value).trim();
  return text ? text.toUpperCase() : undefined;
}

function normalizeString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function guessFormat(version: FileVersion): string | undefined {
  const name = version.original_name ?? "";
  const ext = extractExtension(name);
  if (ext) return ext;
  if (version.mime) {
    const part = version.mime.split("/").pop();
    if (part) return part.toUpperCase().slice(0, 4);
  }
  return undefined;
}

function extractExtension(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split(".");
  if (parts.length < 2) return undefined;
  return parts.pop()?.toUpperCase().slice(0, 4);
}

function applyEntityToFields(entity: FileEntity, path: (string | number)[], setPath: (path: (string | number)[], value: unknown) => void, delPath: (path: (string | number)[]) => void) {
  const version = entity.version;
  if (!version) return;
  const fileName = version.original_name ?? "";
  const fileFormat = normalizeString(guessFormat(version))?.toLowerCase() ?? "";
  const checksum = normalizeCrc(version.crc32) ?? "";

  setPath([...path, "FileName"], fileName);
  setPath([...path, "FileFormat"], fileFormat);
  setPath([...path, "FileChecksum"], checksum);
}

function InfoRow({ label, value, mismatch }: { label: string; value?: string | null; mismatch?: boolean }) {
  const display = value ?? "—";
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={mismatch ? "text-sm font-medium text-amber-600" : "text-sm"}>{display}</div>
    </div>
  );
}


async function loadObjectFiles(objectId: number): Promise<ObjectFileSummary[]> {
  const cached = OBJECT_FILES_CACHE.get(objectId);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return cached.items;
  }
  const response = await fetch(`/api/files/objects/${objectId}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data: ObjectFileSummary[] = await response.json();
  OBJECT_FILES_CACHE.set(objectId, { items: data, fetchedAt: now });
  return data;
}


