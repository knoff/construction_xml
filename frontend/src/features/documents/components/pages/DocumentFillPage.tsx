import * as React from "react";
import { useParams } from "react-router-dom";
import { RenderRoot } from "@/features/forms-renderer/modules/renderer/runtime/RenderRoot";
import { useFormState } from "@/features/forms-renderer/modules/renderer/runtime/useFormState";
import type { SchemaModel } from "@/features/forms-renderer/core/types";
import { validateModel } from "@/features/forms-renderer/modules/validator";
import { ValueLinkProvider } from "@/features/forms-renderer/hooks/useValueLinks";
import { MappingDialogProvider } from "@/features/forms-renderer/modules/mapper/runtime";
import { DocumentMetaProvider, UiOverridesProvider, type UiOverrides } from "@/features/documents/context";

/** DocumentFill: загрузка меты документа, internal-model, рендер формы и сохранение версий. */
export default function DocumentFillPage() {

  const { id } = useParams(); // document id
  const [doc, setDoc] = React.useState<any | null>(null);
  const [model, setModel] = React.useState<SchemaModel | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<boolean>(false);
  const stateCtl = useFormState<any>({});
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const [uiOverrides, setUiOverrides] = React.useState<UiOverrides>({});
  const [uiDirty, setUiDirty] = React.useState<boolean>(false);

  /** Загрузить мету документа, при необходимости конкретную версию и схему */
  async function loadAll(docId: string, versionId?: number) {
    setErr(null);
    // 1) document meta (+ latest payload if backend так возвращает)
    const r = await fetch(`/api/documents/${docId}`);
    if (!r.ok) throw new Error(await r.text());
    const d = await r.json();
    setDoc(d);

    // 2) payload: запрошенная версия → иначе latest из меты → иначе {}
    let nextPayload: any = {};
    if (versionId != null) {
      const rv = await fetch(`/api/documents/${docId}/versions/${versionId}`);
      if (!rv.ok) throw new Error(await rv.text());
      const jv = await rv.json();
      nextPayload = jv?.payload ?? {};
    } else {
      nextPayload = d?.payload ?? {};
    }
    stateCtl.setState((prev: any) => {
      try {
        if (JSON.stringify(prev) === JSON.stringify(nextPayload)) return prev;
      } catch {}
      return nextPayload ?? {};
    });

    // 3) internal model
    const schemaId = d?.schema?.id;
    if (!schemaId) throw new Error("У документа не указана схема");
    const r2 = await fetch(`/api/schemas/${schemaId}/internal-model`);
    if (!r2.ok) throw new Error(await r2.text());
    const j = await r2.json();
    // сервер может вернуть {model: {...}} или саму модель
    setModel(j?.model ?? j);
    // ui_overrides могут прийти сразу в payload
    const fromPayload = j?.schema?.ui_overrides;
    if (fromPayload && typeof fromPayload === "object") {
      setUiOverrides(fromPayload as UiOverrides);
      setUiDirty(false);
    } else {
      // на всякий случай подгрузим напрямую
      const r3 = await fetch(`/api/schemas/${schemaId}/ui-overrides`);
      if (r3.ok) {
        const j3 = await r3.json();
        setUiOverrides((j3?.ui_overrides ?? {}) as UiOverrides);
        setUiDirty(false);
      }
    }
  }

  // ----- сохранение UI-переопределений схемы -----
  async function saveUiOverrides() {
    if (!doc?.schema?.id) return;
    try {
      const r = await fetch(`/api/schemas/${doc.schema.id}/ui-overrides`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_overrides: uiOverrides }),
      });
      if (!r.ok) throw new Error(await r.text());
      await r.json();
      setUiDirty(false);
      alert("UI-переопределения сохранены");
    } catch (e:any) {
      alert(String(e?.message ?? e));
    }
  }
  // первичная загрузка
  React.useEffect(() => {
    if (id) loadAll(id).catch(e => setErr(String(e)));
  }, [id]);

  // лайв-валидация
  React.useEffect(() => {
    if (model) {
      const errs = validateModel({
        state: stateCtl.state,
        fields: model.root,
        types: model.types,
      });
      setErrors(errs);
    }
  }, [model, stateCtl.state]);

  // single Save: always create a new version (retention trims old unprotected)
  async function saveNewVersion() {
    if (!id) return;
    if (Object.keys(errors).length > 0) {
      const total = Object.values(errors).reduce((n,a)=>n+a.length,0);
      alert(`Внимание: обнаружены ошибки (${total}). Сохранение будет выполнено.`);
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/documents/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: stateCtl.state }),
      });
      if (!r.ok) throw new Error(await r.text());
      alert("Сохранено");
      await loadAll(String(id));
    } catch (e: any) {
      alert(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  if (err) return <div className="p-6 text-red-700">Ошибка: {err}</div>;
  if (!doc || !model) return <div className="p-6">Загрузка…</div>;

  return (
    <div className="p-6 space-y-4">

      <div className="sticky top-0 z-20 bg-[var(--background)] pt-2 pb-2 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Заполнение: {doc?.schema?.name} — объект «{doc?.object?.name ?? "—"}»
          </h2>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-[var(--radius)] border px-3 text-sm inline-flex items-center whitespace-nowrap disabled:opacity-50"
              onClick={saveNewVersion}
              disabled={saving}
            >
              Сохранить
            </button>
            <button
              type="button"
              className="h-9 rounded-[var(--radius)] border px-3 text-sm inline-flex items-center whitespace-nowrap disabled:opacity-50"
              onClick={saveUiOverrides}
              disabled={!uiDirty}
              title="Сохранить UI-переопределения для этой схемы"
            >
              Сохранить UI-правки
            </button>
            <a
              className="h-9 rounded-[var(--radius)] border px-3 text-sm inline-flex items-center whitespace-nowrap"
              href="/ui/documents"
            >
              К списку
            </a>
          </div>
        </div>
        {doc?.latest_version_id ? (
          <div className="text-xs text-zinc-500 mt-1">
            Текущая версия: #{doc.latest_version_id}
          </div>
        ) : (
          <div className="text-xs text-zinc-500 mt-1">
            Версий пока нет — первая будет создана при сохранении
          </div>
        )}
      </div>

      {/* Форма по internal model */}
      <UiOverridesProvider
        value={{
          overrides: uiOverrides,
          setOverrides: (next: UiOverrides) => {
            setUiOverrides(next ?? {});
            setUiDirty(true);
          },
          markDirty: () => setUiDirty(true),
        }}
      >
        <DocumentMetaProvider
          value={{
            documentId: Number(id),
            documentUid: doc?.doc_uid ?? null,
            objectId: doc?.object?.id ?? null,
            objectUid: doc?.object?.uid ?? null,
            objectName: doc?.object?.name ?? null,
            schemaId: doc?.schema?.id ?? null,
            schemaCode: doc?.schema?.code ?? null,
            schemaName: doc?.schema?.name ?? null,
            schemaVersion: doc?.schema?.version ?? null,
          }}
        >
          <MappingDialogProvider
            documentContext={{
              documentId: Number(id),

              documentUid: doc?.doc_uid ?? null,
              objectId: doc?.object?.id ?? null,
              objectUid: doc?.object?.uid ?? null,
              objectName: doc?.object?.name ?? null,
              schemaId: doc?.schema?.id ?? null,
              schemaCode: doc?.schema?.code ?? null,
              schemaName: doc?.schema?.name ?? null,
              schemaVersion: doc?.schema?.version ?? null,
            }}
          >
            <ValueLinkProvider>
              <RenderRoot
                fields={model.root}
                types={model.types}
                stateCtl={stateCtl}
                errors={errors}
              />
            </ValueLinkProvider>
          </MappingDialogProvider>
        </DocumentMetaProvider>
      </UiOverridesProvider>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-zinc-500">
          {Object.keys(errors).length > 0
            ? `Ошибок: ${Object.values(errors).reduce((n, a) => n + a.length, 0)}`
            : "Ошибок нет"}
        </div>
        {/* Кнопка «Проверить и сохранить» убрана, чтобы не плодить дубли.
            Проверка выполняется в обработчиках двух кнопок выше. */}
      </div>
    </div>
  );
}

