import React from "react";
import { useFileBindingsDevWarnOnce } from "./context";
import { pathKeyCandidates } from "./path";

export function BindingHighlight({ path, children }:{ path:string; children:React.ReactNode }) {
  const { hasBinding, isContainer, getBinding, _dbg } = useFileBindingsDevWarnOnce("BindingHighlight");
  const marked = hasBinding(path);
  const container = isContainer(path);
  const { binding, matchedKey } = getBinding(path);

  // подготовим короткий title для подсказки
  const id =
    (binding?.id ?? binding?.bindingId ?? binding?.pk ?? "n/a") as string | number;
  const titleShort = marked
    ? `binding#${id} • kind=${binding?.kind ?? "?"} • key=${matchedKey}`
    : undefined;

  // Для понятной диагностики — выводим кандидатов и «победителя»
  try {
    const candidates = pathKeyCandidates(path);
    let winner: string | null = null;
    for (const c of candidates) {
      if (winner) break;
      if (_dbg?.size) {
        // Победителя определяет повторный вызов hasBinding (дешёвый) — здесь просто лог:
        // Чтобы не дергать карту из контекста напрямую, выводим кандидатов;
        // факт подсветки укажет, что один из них совпал.
      }
    }
    // Меньше шума: лог только если есть биндинг или size=0/ошибка
    if (marked || _dbg?.size === 0) {
      console.info("[file-bindings] check", {
        pathClient: path,
        candidates,
        matched: marked,
        container,
        mapSize: _dbg?.size,
        schemaId: _dbg?.schemaId,
        matchedKey,
        binding,
      });
    }
  } catch {}

  // Используем tailwind-классы, которые уже есть в проекте
  // (не меняем существующую разметку: оборачиваем в <div> с классами)
  const cls = marked
    ? container
      ? "bg-amber-50 border border-amber-300 rounded-xl"
      : "bg-lime-100 border border-lime-400 rounded-xl"
    : "";

  // Бейдж — всегда (пока отлаживаем); клик по бейджу — подробный лог
  const text = marked ? (container ? "FB:container" : "FB:file") : "FB:none";
  const onBadgeClick: React.MouseEventHandler<HTMLSpanElement> = (e) => {
    e.stopPropagation(); // чтобы не схлопывать Collapsible
    // подробный лог объекта из биндингов
    console.info("[file-bindings] badge-click", {
      pathClient: path,
      matchedKey,
      binding,
    });
  };
  const badge = (
    <span
      className="text-[10px] px-1 py-0.5 rounded bg-black/60 text-white absolute right-2 top-2 cursor-pointer select-none"
      role="button"
      tabIndex={0}
      onClick={onBadgeClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onBadgeClick(e as any)}
      title={titleShort}
    >
      {text}
    </span>
  );

  return (
    <div
      className={cls + " relative"}
      data-fb-state={marked ? (container ? "container" : "file") : "none"}
      data-fb-path={path}
      data-fb-size={_dbg?.size ?? undefined}
      data-fb-schema={_dbg?.schemaId ?? undefined}
      title={titleShort}
    >
      {badge}
      {children}
    </div>
  );
}
