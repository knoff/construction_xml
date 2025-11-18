import * as React from "react";
import type { ValueLinkMatch, ValueLinkStatus } from "@/features/forms-renderer/hooks/useValueLinks";
import { useValueLinkStatus, useValueLinks } from "@/features/forms-renderer/hooks/useValueLinks";
import type { Path } from "@/features/forms-renderer/core/utils/path";

export function ValueLinkStatusBadge({
  status,
  available,
}: {
  status: ValueLinkStatus | undefined;
  available: boolean;
}) {
  if (!available) {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500">
        Сопоставление не настроено
      </span>
    );
  }

  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500">
        Не проверено
      </span>
    );
  }

  switch (status.state) {
    case "loading":
      return (
        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-600">
          Проверка…
        </span>
      );
    case "matched":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
          Совпадение найдено
        </span>
      );
    case "empty":
      return (
        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500">
          Совпадений нет
        </span>
      );
    case "mismatch":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-600">
          Есть отличия
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
          Ошибка
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500">
          Неизвестно
        </span>
      );
  }
}

export function ValueLinkMatches({ matches, status }: { matches: ValueLinkMatch[]; status: ValueLinkStatus["state"] }) {
  if (!matches.length) return null;
  return (
    <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
      <div className="font-medium text-zinc-600">Найденные значения ({matches.length})</div>
      <ul className="space-y-2">
        {matches.map((match, idx) => {
          if (match.source_type === "document" && match.document) {
            const doc = match.document;
            return (
              <li key={`doc-${doc.uid ?? idx}`} className="rounded border border-emerald-100 bg-white p-2">
                <div className="font-medium text-emerald-700">Документ {doc.uid ?? "—"}</div>
                <div className="mt-1 space-y-0.5">
                  <div>Схема: {doc.schema_code ?? "—"} v{doc.schema_version ?? "?"}</div>
                  <div>Объект ID: {doc.object_id ?? "—"}</div>
                  <div>
                    Значение: <code>{String(match.value ?? "—")}</code>
                  </div>
                </div>
              </li>
            );
          }
          if (match.source_type === "entity" && match.entity) {
            const ent = match.entity;
            return (
              <li key={`ent-${ent.uid ?? idx}`} className="rounded border border-sky-100 bg-white p-2">
                <div className="font-medium text-sky-700">Сущность {ent.type ?? "—"}</div>
                <div className="mt-1 space-y-0.5">
                  <div>ID: {ent.id ?? "—"}</div>
                  <div>UID: {ent.uid ?? "—"}</div>
                  <div>
                    Значение: <code>{String(match.value ?? "—")}</code>
                  </div>
                </div>
              </li>
            );
          }
          return (
            <li key={`raw-${idx}`} className="rounded border border-zinc-200 bg-white p-2">
              <div className="font-medium text-zinc-700">{match.key}</div>
              <div className="mt-1">
                Значение: <code>{String(match.value ?? "—")}</code>
              </div>
            </li>
          );
        })}
      </ul>
      {status === "mismatch" && (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-amber-600">
          Значение в форме отличается от найденных сопоставлений.
        </div>
      )}
      {status === "error" && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-red-600">
          Не удалось проверить совпадения. Повторите попытку позже.
        </div>
      )}
    </div>
  );
}

export function ValueLinkQuickCheck({
  path,
  value,
  label,
  variant = "button",
}: {
  path: Path;
  value: unknown;
  label: string;
  variant?: "button" | "inline";
}) {
  const links = useValueLinks();
  const status = useValueLinkStatus(path);
  const mappingKey = React.useMemo(() => links.buildKey(path), [links, path]);

  const normalized = typeof value === "string" ? value.trim() : value;
  const canCheck = Boolean(mappingKey && normalized !== undefined && normalized !== null && String(normalized).trim().length > 0);
  const checking = status?.state === "loading";

  const handleCheck = React.useCallback(() => {
    if (!canCheck) return;
    void links.check(path, normalized ?? value ?? null);
  }, [canCheck, links, path, normalized, value]);

  const badge = <ValueLinkStatusBadge status={status} available={Boolean(mappingKey)} />;

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500">{label}</span>
        {badge}
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
          onClick={handleCheck}
          disabled={!canCheck || checking}
        >
          {checking ? "Проверка…" : "Проверить"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="flex items-center gap-2">
        {badge}
        <button
          type="button"
          className="h-7 rounded-[var(--radius)] border px-2 text-xs disabled:opacity-50"
          onClick={handleCheck}
          disabled={!canCheck || checking}
        >
          {checking ? "Проверка…" : "Проверить"}
        </button>
      </div>
    </div>
  );
}

