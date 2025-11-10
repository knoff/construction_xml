import * as React from "react";
import type { FieldModel } from "./types";


// --- centralized utils (moved out of Renderer) ---
import {
  pathKey,
  normalizePathKey,
  normalizeKey,
  splitKey,
  getAtPath,
  setAtPath, delAtPath, Path as PathType, splitChoiceContainer, filterChoiceGroup,
} from "@/features/forms/utils/path";
import {
  countSubtreeErrors,
  getLocalErrorsForPath,
  hasAnyValidatorErrors,
  hasRequiredWord,
} from "@/features/forms/utils/errors";
import { isArrayMultiplicity, isRequiredField, isEmptyValue, minMaxText } from "@/features/forms/utils/xsd";

import { inputKind, coerceValue } from "./controls";
import { RowLayoutContext } from "@/features/forms/ui/block-row";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { useUiOverrides } from "@/pages/DocumentFill"; // общий стор переопределений

import { firstAllowedComponentFor, UI_COMPONENTS, canUseComponent } from "@/features/forms/ui/registry";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

// новье для дальнейшей замены JSX на готовые компоненты
// import { UiOverrideBadge } from "@/features/forms/components/Badges";
// import { ReorderRow } from "@/features/forms/components/lists/ReorderRow";
// import { BlockFrame } from "@/features/forms/components/BlockFrame";
// import { LabelEditorDialog } from "@/features/forms/dialogs/LabelEditorDialog";
// import { useUiMetaForPath } from "@/features/forms/hooks/useUiMeta";

// --- helpers for legacy migration of __choice__ → __choice__#NN ---
function isNamedChoice(name?: string) {
  return typeof name === "string" && /^__choice__#\d{2}$/.test(name);
}
function readChoiceContainer(state: any, path: (string|number)[], f: FieldModel, options: {name:string}[]) {
  // если новый путь пуст, пытаемся прочитать legacy "__choice__" и отфильтровать только свою группу
  const cur = getAtPath(state, path);
  if (cur != null) return cur;
  if (!isNamedChoice(f.name)) return cur;
  const legacyPath = [...path.slice(0, -1), "__choice__"];
  const legacy = getAtPath(state, legacyPath);
  if (legacy == null) return cur;
  // берём только элементы/ключи, чьи верхние ключи ∈ options
  if (Array.isArray(legacy)) {
    const allow = new Set(options.map(o => o.name));
    return legacy.filter(it => it && typeof it === "object" && allow.has(Object.keys(it)[0]));
  }
  if (legacy && typeof legacy === "object") {
    const allow = new Set(options.map(o => o.name));
    const out: any = {};
    for (const k of Object.keys(legacy)) if (allow.has(k)) out[k] = legacy[k];
    return Object.keys(out).length ? out : cur;
  }
  return cur;
}



function composeChoiceContainer(arr: any[], obj: Record<string, any>) {
  if (Object.keys(obj).length > 0) {
    const out: Record<string, any> = { ...obj };
    arr.forEach((it, i) => { out[String(i)] = it; });
    return out;
  }
  return arr;
}

function clearContainerForSelect(container: any, options: any[], nextName: string) {
  const out = { ...(container ?? {}) };
  const seq = options.find((o: any) => o.kind === "sequence");
  // убрать все одиночные опции, кроме выбранной
  for (const opt of options.filter((o: any) => o.kind !== "sequence")) {
    if (opt.name !== nextName) delete out[opt.name];
  }
  // если выбираем одиночную опцию — чистим детей sequence
  if (seq && Array.isArray(seq.children) && nextName !== "__sequence__") {
    for (const ch of seq.children) delete out[ch.name];
  }
  // если выбираем sequence — чистим одиночные опции (на всякий случай)
  if (nextName === "__sequence__") {
    for (const opt of options.filter((o: any) => o.kind !== "sequence")) delete out[opt.name];
  }
  return out;
}

// ---------- form-state ----------

export function useFormState<T extends object>(initial: T) {
  const [state, setState] = React.useState<T>(initial);
  const setPath = React.useCallback((path: PathType, val: any) => {
    setState(prev => setAtPath(prev, path, val));
  }, []);
  const delPath = React.useCallback((path: PathType) => {
    setState(prev => delAtPath(prev, path));
  }, []);
  return { state, setPath, delPath, setState };
}

/** «Shallow» проверка обязательности конкретного узла по значению */
function shallowMissingForField(f: FieldModel, valueAtPath: any): boolean {
  if (isArrayMultiplicity(f)) {
    const min = f.minOccurs ?? 1;
    const arr = Array.isArray(valueAtPath) ? valueAtPath : [];
    return min > 0 && arr.length === 0;
  }
  if (f.kind === "attribute" || (f.dtype !== "object" && !f.children && !f.attributes)) {
    return isRequiredField(f) && isEmptyValue(valueAtPath);
  }
  if ((f.minOccurs ?? 1) > 0 && valueAtPath == null && f.dtype === "object") {
    return true;
  }
  return false;
}

type UiOverride = { path: string; ui_id: string };

type UiOverridesCtxT = {
  items: UiOverride[];
  getUiForPath: (rawPk: string) => string | undefined; // возвращает ui_id или undefined
  setUiForPath: (rawPk: string, ui_id: string) => void;
  clearUiForPath: (rawPk: string) => void;
};

// ---------- resolve refType & collapse state ----------

function useResolvedField(f: FieldModel, types: Record<string, any>, visitedTypes: Set<string>): FieldModel {
  return React.useMemo(() => {
    if (f?.refType && types?.[f.refType]?.kind === 'complexType') {
      if (visitedTypes.has(f.refType)) return f; // cycle guard
      const t = types[f.refType];
      return {
        ...f,
        documentation: f.documentation ?? t.documentation ?? undefined,
        children: f.children ?? (t.children as FieldModel[] | undefined),
        attributes: f.attributes ?? (t.attributes as FieldModel[] | undefined),
      };
    }
    return f;
  }, [f, types, visitedTypes]);
}

// локальное хранилище «свернутости» блоков (по ключу пути)
const CollapseCtx = React.createContext<{
  get:(k:string)=>boolean|undefined,
  set:(k:string, v:boolean)=>void
}>({
  get: ()=>undefined,
  set: ()=>{}
});
function useCollapse() {
  return React.useContext(CollapseCtx);
}

// ---------- label-overrides (in-memory) ----------

type LabelOverride = { path: string; original: string; value?: string }; // path должен быть УЖЕ нормализован
type LabelOverridesCtxT = {
  items: LabelOverride[];
  getLabel: (pathKey: string) => string | undefined;     // принимает сырой pk, сам нормализует
  hasOverride: (pathKey: string) => boolean;             // для подсветки бейджа
  editLabel: (ov: LabelOverride) => void;                // path внутри ov — нормализован
  removeLabel: (pathKey: string) => void;                // принимает сырой pk, сам нормализует
  openEditor: (args: { pathKey: string; original: string; current?: string }) => void;
};
const LabelOverridesCtx = React.createContext<LabelOverridesCtxT>({
  items: [],
  getLabel: () => undefined,
  hasOverride: () => false,
  editLabel: () => {},
  removeLabel: () => {},
  openEditor: () => {},
});
function useLabelOverrides() {
  return React.useContext(LabelOverridesCtx);
}

function BlockFrame(props:{
  f: FieldModel;
  isBlock: boolean;
  path: (string|number)[];
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  hasError?: boolean;
  errsHere?: string[];
  /** Общее число ошибок в поддереве (k и k.*). Если не задано — используем errsHere?.length */
  errCount?: number;
  /** Небольшое превью сообщений для title бейджа */
  errPreview?: string[];
}) {
  const { isBlock, f, path, headerExtra, children, hasError, errsHere, errCount, errPreview } = props;
  const { get, set } = useCollapse();
  const k = pathKey(path);
  // По умолчанию: блоки свернуты, обычные контейнеры раскрыты
  const initial = get(k);
  const [open, setOpen] = React.useState<boolean>(
    typeof initial === "boolean" ? initial : (isBlock ? false : true)
  );
  React.useEffect(()=> set(k, open), [k, open, set]);

  // DEBUG: type name only for blocks (refType → complexType)
  const debugType = props.f && (props as any).f.refType ? `[type: ${(props as any).f.refType}]` : null;

  // Имя типа для бейджа: сначала refType (именованный complexType), иначе dtype/“object”
  const typeName =
    (f as any)?.refType
      ? String((f as any).refType)
      : (f as any)?.dtype
        ? String((f as any).dtype)
        : "object";

  // Кликабельный бейдж: печатает в консоль информацию о блоке и его путь
  const TypeBadge = isBlock ? (
    <button
      type="button"
      className="rounded-full border px-2 py-0.5 text-[10px] leading-none opacity-70 hover:opacity-100"
      title="Клик — вывести информацию о блоке в консоль"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation(); // не сворачиваем блок при клике по бейджу
        try {
          console.groupCollapsed(`[BLOCK] ${typeName} @ ${k}`);
          console.log({
            pathArray: path,
            path: k,
            field: f,              // узел схемы (включая children/attributes, min/maxOccurs и т.д.)
            isBlock,
          });
          console.groupEnd();
        } catch {
          console.info("[BLOCK]", { pathArray: path, path: k, field: f, isBlock });
        }
      }}
      data-path={k}
      data-type={typeName}
    >
      {typeName}
    </button>
  ) : null;


  // UI-бейдж для блоков (переопределение лэйаута блока) — с жёсткими дефолтами и защитами
  const UiBadgeForBlock = isBlock ? (() => {
    const ui = useUiOverrides?.() as ReturnType<typeof useUiOverrides> | undefined;
    // если по какой-то причине контекст недоступен — не рисуем бейдж
    if (!ui) return null;
    const npk = typeof normalizePathKey === "function" ? normalizePathKey(k) : k;
    const all = Array.isArray(UI_COMPONENTS) ? UI_COMPONENTS : [];
    // берём только блочные компоненты
    const blockMetas = all.filter(m => m?.kind === "block");
    // canUseComponent может полагаться на match; страхуемся
    const safeAllowed = blockMetas.filter(m => {
      try { return canUseComponent(m, { f, isBlock: true }); }
      catch { return false; }
    });
    if (!safeAllowed || (safeAllowed as any[]).length === 0) return null;
    const current = (ui.overrides?.widgets && typeof ui.overrides.widgets === "object")
      ? (ui.overrides.widgets as Record<string, string | undefined>)[npk]
      : undefined;
    const highlighted = Boolean(current);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={
              "rounded-full border px-2 py-0.5 text-[10px] leading-none " +
              (highlighted ? "bg-amber-50 border-amber-300" : "opacity-70 hover:opacity-100")
            }
            title="Переопределить UI блока"
            onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
          >
            UI
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6}>
          {safeAllowed && safeAllowed.map(meta => (
            <DropdownMenuItem
              key={meta.id}
              onSelect={(e) => {
                e.preventDefault();
                const next = { ...(ui.overrides || {}) } as any;
                next.widgets = { ...(next.widgets || {}) };
                next.widgets[npk] = meta.id;
                ui.setOverrides(next);
                ui.markDirty();
              }}
            >
              <span className="flex-1">{meta.title}</span>
              {current === meta.id ? <span className="text-zinc-500">✓</span> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              const next = { ...(ui.overrides || {}) } as any;
              if (next.widgets && next.widgets[npk]) {
                next.widgets = { ...next.widgets };
                delete next.widgets[npk];
                ui.setOverrides(next);
                ui.markDirty();
              }
            }}
          >
            Сбросить переопределение
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  })() : null;

  // override для label блока
  const { getLabel, hasOverride, openEditor } = useLabelOverrides();
  const overriddenBlockLabel = getLabel(k);
  const blockOriginal = (f.documentation?.label ?? f.name);
  const labelHighlighted = hasOverride(k);

  const Label = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="h-7 w-7 flex-none shrink-0 inline-flex items-center justify-center rounded border text-xs leading-none p-0"
        onClick={()=> setOpen(o=>!o)}
        aria-label={open ? "Свернуть" : "Развернуть"}
      >
        {open ? "−" : "+"}
      </button>
      <label className="text-sm font-semibold">
        {(overriddenBlockLabel ?? blockOriginal)}{" "}
        {isBlock && isRequiredField(f) ? " *" : ""}
        {isBlock && (
          <span className="text-[10px] text-zinc-500 ml-1">
            {minMaxText(f)} {debugType ? ` ${debugType}` : ""}
          </span>
        )}
      </label>
      {/* бейдж количества ошибок у блока — виден и в свернутом состоянии */}
      {hasError ? (
        <span
          className="ml-1 inline-flex items-center rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] leading-none text-red-700"
          title={
            (errPreview && errPreview.length > 0)
              ? errPreview.join("\n")
              : (errsHere && errsHere.length ? errsHere.join("\n") : "Есть ошибки в разделе")
          }
        >
          Ошибки{typeof errCount === "number"
            ? `: ${errCount}`
            : (errsHere && errsHere.length ? `: ${errsHere.length}` : "")
          }
        </span>
      ) : null}
      {/* Бейдж Label для блока */}
      <button
        type="button"
        className={
          "rounded-full border px-2 py-0.5 text-[10px] leading-none " +
          (labelHighlighted ? "bg-amber-50 border-amber-300" : "opacity-70 hover:opacity-100")
        }
        title="Изменить подпись (Label) блока"
        onClick={(e)=>{
          e.preventDefault();
          e.stopPropagation();
          openEditor({ pathKey: k, original: blockOriginal, current: overriddenBlockLabel });
        }}
      >
        Label
      </button>
      {TypeBadge}
      {UiBadgeForBlock}
      {headerExtra}
    </div>
  );

  if (!isBlock) {
    // обычный контейнер (не «блок»): лёгкая рамка
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">{Label}</div>
        {open && (
          <div className={`rounded-xl border p-3 grid gap-3 ${hasError ? "border-red-500" : ""}`}>
            {children}
            {errsHere && errsHere.length > 0 && (
              <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
                {errsHere.map((e,i)=><li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  // «Блок»: более явная рамка и фон
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">{Label}</div>
      {open && (
        <div className={`rounded-2xl border-2 p-4 grid gap-3 bg-[rgba(0,0,0,0.02)] ${hasError ? "border-red-500" : ""}`}>
          {children}
          {errsHere && errsHere.length > 0 && (
            <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
              {errsHere.map((e,i)=><li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UiOverrideBadge({ f, path }: { f: FieldModel; path: (string|number)[] }) {
  const ui = useUiOverrides();
  const isBlock = false; // для поля — false; для блока — true
  const pk = pathKey(path);
  const npk = normalizePathKey(pk);

  // список допустимых компонентов по реестру (фильтрация по типу/блоку)
  const all = Array.isArray(UI_COMPONENTS) ? UI_COMPONENTS : [];
  const allowed = all.filter(m => {
    try { return canUseComponent(m, { f, isBlock: false }); }
    catch { return false; }
  });
  const current = ui.overrides?.widgets?.[normalizePathKey(pk)];
  const highlighted = Boolean(current);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            "rounded-full border px-2 py-0.5 text-[10px] leading-none " +
            (highlighted ? "bg-amber-50 border-amber-300" : "opacity-70 hover:opacity-100")
          }
          title="Переопределить UI-компонент"
        >
          UI
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6}>
        {(!allowed || allowed.length === 0) && (
          <DropdownMenuItem disabled>Нет доступных компонентов</DropdownMenuItem>
        )}
        {allowed && allowed.map(meta => (
          <DropdownMenuItem
            key={meta.id}
            onSelect={(e) => {
              e.preventDefault(); // не закрывать из-за preventDefault? (Radix закроет сам; оставим на всякий)
              const next = { ...(ui.overrides || {}) };
              next.widgets = { ...(next.widgets || {}) };
              next.widgets[npk] = meta.id;
              ui.setOverrides(next);
              ui.markDirty();
            }}
          >
            <span className="flex-1">{meta.title}</span>
            {current === meta.id ? <span className="text-zinc-500">✓</span> : null}
          </DropdownMenuItem>
        ))}
        {allowed.length > 0 && <DropdownMenuSeparator/>}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            const next = { ...(ui.overrides || {}) };
            if (next.widgets && next.widgets[npk]) {
              next.widgets = { ...next.widgets };
              delete next.widgets[npk];
              ui.setOverrides(next);
              ui.markDirty();
            }
          }}
        >
          Сбросить переопределение
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- small parts ----------

function FieldLabel({ f, path }: { f: FieldModel; path: (string|number)[] }) {
  const { getLabel, hasOverride, openEditor } = useLabelOverrides();
  const pk = pathKey(path);
  const original = f.documentation?.label ?? f.name;
  const overridden = getLabel(pk);
  const txt = overridden ?? original;
  const required = isRequiredField(f);
  const highlighted = hasOverride(pk);

  // --- аккуратный кламп: 1–2 строки без “третьей тени” ---
  // Берём число строк из контекста лэйаута (если есть), иначе 2
 type RowLayoutCtx = { labelLines?: number };
 const lines =
   typeof RowLayoutContext !== "undefined"
     ? (React.useContext(RowLayoutContext as React.Context<RowLayoutCtx>)?.labelLines ?? 1)
     : 2;

  const lineRem = 1.25; // text-sm, leading-tight ~ 1.25rem
  const clampStyle: React.CSSProperties = { height: `${(lines === 1 ? 1 : 2) * lineRem}rem` };

  return (
    <div className="flex flex-col gap-1">
      {/* Тонкая "панель" действий над заголовком */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={
            "rounded-full border px-2 py-0.5 text-[10px] leading-none " +
            (highlighted ? "bg-amber-50 border-amber-300" : "opacity-70 hover:opacity-100")
          }
          title="Изменить подпись (Label)"
          onClick={(e)=>{
            e.preventDefault();
            e.stopPropagation();
            openEditor({ pathKey: pk, original, current: overridden });
          }}
        >
          Label
        </button>
        <UiOverrideBadge f={f} path={path}/>
      </div>
      <label className="text-sm font-medium">
        {/* В одну строку потока: текст (кламп) + звёздочка; звезда вне клампа и рядом */}
        <span className="inline-flex max-w-full items-start gap-1 align-top">
          <span
            className={
              // многострочный кламп c «…» + жёсткая высота и правильная высота строки
              "min-w-0 overflow-hidden leading-5 " + // leading-5 = 1.25rem
              "[display:-webkit-box] [-webkit-box-orient:vertical] " +
              (lines === 1 ? "[-webkit-line-clamp:1]" : "[-webkit-line-clamp:2]")
            }
            style={clampStyle}
            title={txt}
          >
            {txt}
          </span>
          {required ? <span aria-hidden="true" className="leading-5">*</span> : null}
        </span>
      </label>
    </div>
  );
}
function Help({ f }: { f: FieldModel }) {
  const h = f.documentation?.help;
  return h ? <div className="text-xs text-zinc-500 mt-1">{h}</div> : null;
}
function SimpleInput({ f, value, onChange, path }: {
  f: FieldModel; value: any; onChange: (v:any)=>void; path: (string|number)[];
}) {
  const ui = useUiOverrides();
  const manualUi = ui.overrides?.widgets?.[normalizePathKey(pathKey(path))] as (string|undefined);
  const manualMeta = manualUi ? UI_COMPONENTS.find(x => x.id === manualUi) ?? null : null;
  const facets = f.facets ?? {};
  const hasEnum = (Array.isArray(facets.enum) && facets.enum.length > 0) ||
                (Array.isArray((facets as any).enumOptions) && (facets as any).enumOptions.length > 0);
  const kind = hasEnum ? "select" : inputKind(f.dtype, f.facets);
  // eslint-disable-next-line no-console
  console.debug("[SimpleInput]", { path: normalizePathKey(pathKey(path)), dtype: f.dtype, facets: f.facets, kind });
  if (kind === "select") {
    // РЕНДЕРИМ КАСТОМНЫЙ КОМПОНЕНТ ТОЛЬКО ЕСЛИ ВЫБРАН ВРУЧНУЮ В БЕЙДЖЕ UI
    const ui = useUiOverrides();
    const manualUi = ui.overrides?.widgets?.[normalizePathKey(pathKey(path))] as (string|undefined);
    const manualMeta = manualUi ? UI_COMPONENTS.find(x => x.id === manualUi) ?? null : null;
    if (manualMeta && canUseComponent(manualMeta, { f, isBlock: false })) {
      const Comp = manualMeta.Render as React.FC<{
        f: FieldModel; path: (string|number)[]; value: unknown;
        setValue: (v: unknown) => void; clearValue?: () => void;
      }>;
      return (
        <Comp
          f={f} path={path} value={value}
          setValue={(v)=> onChange(v)} clearValue={()=> onChange(undefined)}
        />
      );
    }
    // ДЕФОЛТ — обычный <select>
    type SelectOption = { value: string; label?: string };
    const opts: SelectOption[] = React.useMemo(() => {
      const eo = f.facets?.enumOptions as SelectOption[] | undefined;
      if (eo?.length) return eo;
      const en = f.facets?.enum as string[] | undefined;
      return (en ?? []).map(v => ({ value: String(v) })); // label опционален
    }, [f.facets]);
    return (
      <select className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
              value={value ?? ""} onChange={e => onChange(e.target.value)}>
        <option value="">— выберите —</option>
        {opts.map(o => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
      </select>
    );
  }
  if (kind === "number") {
    return <input type="number" className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                  value={value ?? ""} onChange={e => onChange(coerceValue(f.dtype, e.target.value))} />;
  }
  if (kind === "date") {
    const meta = manualMeta && canUseComponent(manualMeta, { f, isBlock: false })
      ? manualMeta
      : firstAllowedComponentFor(f, /* isBlock */ false);
    if (meta) {
      const Comp = meta.Render as React.FC<{
        f: FieldModel;
        path: (string|number)[];
        value: unknown;
        setValue: (v: unknown) => void;
        clearValue?: () => void;
      }>;
      return (
        <Comp f={f} path={path} value={value}
          setValue={(v)=> onChange(v)} clearValue={()=> onChange(undefined)} />
      );
    }
    // Fallback на нативный инпут, если подмены нет
    return <input type="date" className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                  value={value ?? ""} onChange={e => onChange(e.target.value)} />;
  }
  // Проверяем ручное переопределение (например, textarea)
  if (manualMeta && canUseComponent(manualMeta, { f, isBlock: false })) {
    const Comp = manualMeta.Render as React.FC<{
      f: FieldModel; path: (string|number)[]; value: unknown;
      setValue: (v: unknown)=>void; clearValue?: ()=>void;
    }>;
    return (
      <Comp f={f} path={path} value={value}
        setValue={(v)=> onChange(v)} clearValue={()=> onChange(undefined)} />
    );
  }
  return (
    <input type="text" className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
      value={value ?? ""} onChange={e => onChange(e.target.value)} />
  );
}

// ---------- main recursive block ----------

function FieldBlock(props: {
  f: FieldModel; path: (string|number)[];
  state: any; setPath: (p:(string|number)[],v:any)=>void; delPath:(p:(string|number)[])=>void;
  types: Record<string, any>;
  visitedTypes: Set<string>;
  errors?: Record<string, string[]>;
}) {
  const { types, visitedTypes, errors } = props as any;
  const thisKey = pathKey(props.path);
  const thisErrs: string[] = errors?.[thisKey] ?? [];
  // есть ли ошибки в этом узле или в его поддереве
  const hasErrHere = thisErrs.length > 0;
  const hasErrSub = React.useMemo(() => {
    const { count } = countSubtreeErrors(errors ?? {}, thisKey);
    return count > 0;
  }, [errors, thisKey]);

  // единый подсчёт ошибок поддерева, доступный для всех веток
  const subtreeErr = React.useMemo(
    () => countSubtreeErrors(errors ?? {}, thisKey),
    [errors, thisKey]
  );
  // Подсчёт всех ошибок под k и k.*
  /*
  const subtreeErr = React.useMemo(() => {
    if (!errors) return { count: thisErrs.length, preview: thisErrs.slice(0, 3) };
    const pref = thisKey + ".";
    let count = thisErrs.length;
    const preview: string[] = [...thisErrs];
    for (const [k, arr] of Object.entries(errors)) {
      if (k === thisKey || k.startsWith(pref)) {
        if (k !== thisKey) {
          const msgs = arr ?? [];
          count += msgs.length;
          // ограничимся несколькими первыми сообщениями
          for (const m of msgs) {
            if (preview.length < 3) preview.push(m);
            else break;
          }
        }
      }
    }
    return { count, preview };
  }, [errors, thisErrs, thisKey]);
  */
 const nextVisited = React.useMemo<Set<string>>(() => {
   const s = new Set<string>(visitedTypes);
   if (props.f?.refType) s.add(String(props.f.refType));
   return s;
 }, [visitedTypes, props.f?.refType]);

  const f = useResolvedField((props as any).f, types, visitedTypes);
  const { path, state, setPath, delPath } = props as any;
  const min = f.minOccurs ?? 1;
  const max = f.maxOccurs === null ? Infinity : (f.maxOccurs ?? 1);

  // CHOICE
  if (f.kind === "choice") {
    const isArray = isArrayMultiplicity(f);
    const options = (f.children ?? []).filter(x => x.kind !== "attribute");
    const deriveSelected = (container:any): string | null => {
      if (!container || typeof container !== "object") return null;
      // обычные варианты (element)
      for (const opt of options.filter((o:any)=>o.kind !== "sequence")) {
        if (Object.prototype.hasOwnProperty.call(container, opt.name)) return opt.name;
      }
      // sequence-вариант: если в контейнере есть хотя бы один ребёнок sequence — считаем его выбранным
      const seq = options.find((o:any)=>o.kind === "sequence");
      if (seq && Array.isArray((seq as any).children)) {
        if ((seq as any).children.some((ch:any)=>Object.prototype.hasOwnProperty.call(container, ch.name))) {
          return "__sequence__";
        }
      }
      return null;
    };

    
    // ---------------- single choice ----------------
    if (!isArray) {
      // читаем контейнер (с поддержкой legacy "__choice__")
      const container = readChoiceContainer(state, path, f as any, options as any) ?? {};
      const seqOpt = options.find(o => (o as any).kind === "sequence") as any | undefined;
      const selected: string | null = ((): string | null => {
        // 1) обычные элемент-варианты
        for (const opt of options.filter(o => (o as any).kind !== "sequence")) {
          if (Object.prototype.hasOwnProperty.call(container, opt.name)) return opt.name;
        }
        // 2) sequence-вариант — если в контейнере есть хотя бы один ребёнок sequence
        if (seqOpt?.children?.some((ch: any) => Object.prototype.hasOwnProperty.call(container, ch.name))) {
          return "__sequence__";
        }
        // 3) по умолчанию — первая опция
        return options[0]?.name ?? null;
      })();

      // смена варианта: корректно чистим контейнер
      const handleSelectChange = (nextName: string | null) => {
        const cur = getAtPath(state, path);
        const cleared = clearContainerForSelect(cur, options as any, nextName ?? "");
        if (nextName && nextName !== "__sequence__") {
          (cleared as any)[nextName] = (cleared as any)[nextName] ?? {};
        }
        setPath(path, cleared);
      };

      return (
        <div className="space-y-2">
          <FieldLabel f={{...f, documentation: f.documentation ?? {label: "Вариант"}} as any} path={path}/>
          <select
            className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
            value={selected ?? ""}
            onChange={(e) => handleSelectChange(e.target.value || null)}
          >
            {/* элемент-варианты */}
            {options.filter(o => (o as any).kind !== "sequence").map(o => (
              <option key={o.name} value={o.name}>{o.documentation?.label ?? o.name}</option>
            ))}
            {/* виртуальный вариант для xs:sequence (если есть) */}
            {seqOpt && <option value="__sequence__">{seqOpt.documentation?.label ?? "Группа полей"}</option>}
          </select>

          {/* содержимое выбранного варианта */}
          <div className="rounded-xl border p-3 space-y-3">
            {selected === "__sequence__" && seqOpt
              ? (seqOpt.children ?? []).map((ch: any) => (
                  <FieldBlock
                    key={ch.name}
                    f={ch as FieldModel}
                    path={[...path, ch.name]}   // sequence-дети лежат прямо в контейнере
                    state={state} setPath={setPath} delPath={delPath}
                    types={types} visitedTypes={nextVisited}
                    errors={errors}
                  />
                ))
              : options
                  .filter(o => o.name === selected)
                  .map(opt => (
                    <FieldBlock
                      key={opt.name}
                      f={opt}
                      path={[...path, opt.name]}
                      state={state} setPath={setPath} delPath={delPath}
                      types={types} visitedTypes={nextVisited}
                      errors={errors}
                    />
                  ))}
          </div>
        </div>
      );
    }

    // array-choice
    const rawAtPath = getAtPath(state, path);
    const items: any[] = Array.isArray(rawAtPath) ? rawAtPath : [];
    React.useEffect(() => {
      if (rawAtPath != null && !Array.isArray(rawAtPath)) setPath(path, []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Array.isArray(rawAtPath)]);

    return (
      <div className="space-y-2">
        <FieldLabel f={{...f, documentation: f.documentation ?? {label: "Варианты"}} as any} path={path}/>
        <div className={`space-y-3 ${hasErrSub ? "border border-red-500 rounded-xl p-3" : ""}`}>
          {items.map((item, idx) => {
            const selected = ((): string | null => {
              const s = deriveSelected(item);
              return s ?? options[0]?.name ?? null;
            })();
            return (
              <div key={idx} className="rounded-xl border p-3 space-y-3">
                <select className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                        value={selected ?? ""} onChange={(e)=>{
                          const next = e.target.value;
                          const cur = items[idx] ?? {};
                          const cleared: any = {}; cleared[next] = cur[next] ?? {};
                          setPath([...path, idx], cleared);
                        }}>
                  {options.map(o => <option key={o.name} value={o.name}>{o.documentation?.label ?? o.name}</option>)}
                </select>
                {selected && options.filter(o => o.name === selected).map(opt => (
                  <FieldBlock key={opt.name} f={opt}
                    path={[...path, idx, opt.name]} state={state} setPath={setPath} delPath={delPath}
                    types={types} visitedTypes={nextVisited}/>
                ))}
                <div className="flex justify-end">
                  <div className="flex items-center gap-2">
                    <button className="h-8 rounded-xl border px-3 text-sm"
                            onClick={()=>{
                              if (idx <= 0) return;
                              const next = items.slice();
                              [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
                              setPath(path, next);
                            }}>▲</button>
                    <button className="h-8 rounded-xl border px-3 text-sm"
                            onClick={()=>{
                              if (idx >= items.length-1) return;
                              const next = items.slice();
                              [next[idx+1], next[idx]] = [next[idx], next[idx+1]];
                              setPath(path, next);
                            }}>▼</button>
                    <button className="h-8 rounded-xl border px-3 text-sm"
                            onClick={()=> delPath([...path, idx])}>Удалить</button>
                  </div>
                </div>
              </div>
            );
          })}
          <button className="h-8 rounded-xl border px-3 text-sm"
                  onClick={()=>{
                    if (!Array.isArray(rawAtPath)) setPath(path, []);
                    const defName = options[0]?.name ?? "variant";
                    setPath([...path, (Array.isArray(rawAtPath) ? items.length : 0)], { [defName]: {} });
                  }}>
            Добавить
          </button>
        </div>
        <Help f={f}/>
        {hasErrHere && (
          <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
            {thisErrs.map((e,i)=><li key={i}>{e}</li>)}
          </ul>
        )}
      </div>
    );
  }

  // --- simple array (element of simple type with maxOccurs>1/unbounded) ---
  if (f.kind !== "attribute" && f.dtype !== "object" && isArrayMultiplicity(f)) {
    const rawAtPath = getAtPath(state, path);
    const items: any[] = Array.isArray(rawAtPath) ? rawAtPath : [];
    const missingHere = (f.minOccurs ?? 1) > 0 && items.length === 0;
    React.useEffect(() => {
      if (rawAtPath != null && !Array.isArray(rawAtPath)) setPath(path, []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Array.isArray(rawAtPath)]);
    return (
      <div className={`space-y-2 ${hasErrSub ? "border border-red-500 rounded-xl p-3" : ""}`}>
        <FieldLabel f={f} path={path}/>
        <div className="space-y-2">
          {items.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1">
                <SimpleInput f={f} value={val} onChange={(v)=> setPath([...path, idx], v)} path={path} />
              </div>
              <div className="flex items-center gap-2">
                <button className="h-8 rounded-xl border px-3 text-sm"
                        onClick={()=>{
                          if (idx <= 0) return;
                          const next = items.slice();
                          [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
                          setPath(path, next);
                        }}>▲</button>
                <button className="h-8 rounded-xl border px-3 text-sm"
                        onClick={()=>{
                          if (idx >= items.length-1) return;
                          const next = items.slice();
                          [next[idx+1], next[idx]] = [next[idx], next[idx+1]];
                          setPath(path, next);
                        }}>▼</button>
                <button className="h-8 rounded-xl border px-3 text-sm"
                        onClick={()=> delPath([...path, idx])}>Удалить</button>
              </div>
            </div>
          ))}
          <button
            className="h-8 rounded-xl border px-3 text-sm"
            onClick={()=>{
              if (!Array.isArray(rawAtPath)) setPath(path, []);
              setPath([...path, (Array.isArray(rawAtPath) ? items.length : 0)], "");
            }}
          >
            Добавить
          </button>
        </div>
        <Help f={f}/>
        {missingHere && <div className="text-xs text-red-600">Нужно добавить хотя бы один элемент</div>}
        {hasErrHere && (
          <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
            {thisErrs.map((e,i)=><li key={i}>{e}</li>)}
          </ul>
        )}
      </div>
    );
  }

  // attribute or simple scalar (non-array)
  if (f.kind === "attribute" || (f.dtype !== "object" && !f.children && !f.attributes)) {
    const val = getAtPath(state, path);
    const localErrs = getLocalErrorsForPath(errors, path);
    const missingRequired = isRequiredField(f) && isEmptyValue(val);
    // показываем синтетическое «Поле обязательно» только если валидатор ещё не отметил обязательность
    const hasValidatorRequired = localErrs.some(hasRequiredWord);
    const displayErrs = [
      ...(missingRequired && !hasValidatorRequired ? ["Поле обязательно"] : []),
      ...localErrs,
    ];
    // de-dup сообщений
    const dedupErrs = Array.from(new Set(displayErrs));
    return (
      <div className="space-y-1">
        <FieldLabel f={f} path={path}/>
        <SimpleInput f={f} value={val} onChange={(v)=> setPath(path, v)} path={path}  />
        {/*missing && (<div className="text-xs text-red-600">Поле обязательно</div>)*/}
        <Help f={f}/>
        {/* Обязательность и ошибки валидатора */}
        {dedupErrs.length > 0 && (
          <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
            {dedupErrs.map((e,i)=><li key={i}>{e}</li>)}
          </ul>
        )}        
      </div>
    );
  }

  // complex / object
  const isArray = isArrayMultiplicity(f);
  const isBlock = !!(props.f?.refType && types?.[props.f.refType]?.kind === 'complexType');

  // array-complex
  if (isArray) {
    const rawAtPath = getAtPath(state, path);
    const items: any[] = Array.isArray(rawAtPath) ? rawAtPath : [];
    React.useEffect(() => {
      if (rawAtPath != null && !Array.isArray(rawAtPath)) setPath(path, []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Array.isArray(rawAtPath)]);

    const headerExtra = (
      <button
        className="h-8 rounded-xl border px-3 text-sm"
        onClick={()=>{
          if (!Array.isArray(rawAtPath)) setPath(path, []);
          setPath([...path, (Array.isArray(rawAtPath) ? items.length : 0)], {});
        }}
      >
        Добавить
      </button>
    );

    // --- UI override для лэйаута блока-массива (применяется к каждому элементу по нормализованному пути) ---
    const ui = useUiOverrides();


    // локальная проверка обязательных внутри элементов (shallow) — для подсветки блока
    const localMissing = items.some((_, idx) => {
      const container = getAtPath(state, path)?.[idx] ?? {};
      const children = (f.children ?? []) as FieldModel[];
      const attrs = (f.attributes ?? []) as FieldModel[];
      for (const ch of children) {
        const v = container?.[ch.name];
        if (shallowMissingForField(ch, v)) return true;
      }
      for (const at of attrs) {
        const v = container?.[`@${at.name}`];
        if (shallowMissingForField(at, v)) return true;
      }
      return false;
    });
    // Синтетические «обязательные» внутри элементов (для бейджа и подсветки, пока валидатор не отработал)
    const synth = (() => {
      let count = 0; const msgs: string[] = [];
      for (let idx = 0; idx < items.length; idx++) {
        const container = (rawAtPath ?? [])[idx] ?? {};
        for (const ch of (f.children ?? [])) {
          const v = container?.[ch.name];
          const childPath = [...path, idx, ch.name];
          const validatorHas = hasAnyValidatorErrors(errors, childPath);
          if (!validatorHas && shallowMissingForField(ch as any, v)) {
            count++; if (msgs.length < 3) msgs.push("Поле обязательно");
          }
        }
        for (const at of (f.attributes ?? [])) {
          const v = container?.[`@${at.name}`];
          const attrPath = [...path, idx, `@${at.name}`];
          const validatorHas = hasAnyValidatorErrors(errors, attrPath);
          if (!validatorHas && shallowMissingForField(at as any, v)) {
            count++; if (msgs.length < 3) msgs.push("Поле обязательно");
          }
        }
      }
      return { count, msgs };
    })();
    // используем верхнеуровневый subtreeErr
    const blockHasError = hasErrSub || synth.count > 0;

    return (
      <BlockFrame
        f={f}
        isBlock={isBlock}
        path={path}
        headerExtra={headerExtra}
        hasError={blockHasError}
        errsHere={thisErrs}
        errCount={subtreeErr.count + synth.count}
        errPreview={Array.from(new Set([...subtreeErr.preview, ...synth.msgs])).slice(0, 3)}
      >
        {items.map((_, idx) => (
          <div key={idx} className="rounded-xl border p-3 space-y-3 bg-white">
            {(() => {
              const pkItem = pathKey([...path, idx]);
              const npkItem = typeof normalizePathKey === "function" ? normalizePathKey(pkItem) : pkItem; // ....* 
              const pkContainer = pathKey(path);
              const npkContainer = typeof normalizePathKey === "function" ? normalizePathKey(pkContainer) : pkContainer; // без индекса
              // Пытаемся применить override для элемента, иначе — контейнерный
              const manualUi =
                (ui.overrides?.widgets?.[npkItem] as (string|undefined)) ??
                (ui.overrides?.widgets?.[npkContainer] as (string|undefined));
              const manualMeta = manualUi ? (UI_COMPONENTS.find(x => x.id === manualUi) ?? null) : null;

              const childrenJsx = (
                <>
                  {(f.children ?? []).map(child =>
                    <FieldBlock key={child.name}
                      f={child}
                      path={[...path, idx, child.name]}
                      state={state} setPath={setPath} delPath={delPath}
                      types={types} visitedTypes={nextVisited}
                      errors={errors}
                    />
                  )}
                  {(f.attributes ?? []).map(attr =>
                    <FieldBlock key={`@${attr.name}`}
                      f={attr}
                      path={[...path, idx, `@${attr.name}`]}
                      state={state} setPath={setPath} delPath={delPath}
                      types={types} visitedTypes={nextVisited}
                      errors={errors}
                    />
                  )}
                </>
              );

              if (manualMeta && canUseComponent(manualMeta, { f, isBlock: true })) {
                const Comp = manualMeta.Render as React.FC<any>;
                const childrenFields = (f.children ?? []) as FieldModel[];
                const renderChild = (child: FieldModel, childPath: (string|number)[]) => (
                  <FieldBlock
                    key={childPath.join(".")}
                    f={child}
                    path={childPath}
                    state={state} setPath={setPath} delPath={delPath}
                    types={types} visitedTypes={nextVisited}
                    errors={errors}
                  />
                );
                // фикс опечаток: "[.path" → "[...path", + типы в лямбде
                return (
                  <Comp
                    f={f}
                    path={[...path, idx]}
                    childrenFields={childrenFields}
                    renderChild={(c: FieldModel, _p: (string|number)[])=>renderChild(c,[...path, idx, c.name])}
                  />
                );
              }
              return childrenJsx;
            })()}
            <div className="flex justify-end">
              <div className="flex items-center gap-2">
                <button className="h-8 rounded-xl border px-3 text-sm"
                        onClick={()=>{
                          if (idx <= 0) return;
                          const next = items.slice();
                          [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
                          setPath(path, next);
                        }}>▲</button>
                <button className="h-8 rounded-xl border px-3 text-sm"
                        onClick={()=>{
                          if (idx >= items.length-1) return;
                          const next = items.slice();
                          [next[idx+1], next[idx]] = [next[idx], next[idx+1]];
                          setPath(path, next);
                        }}>▼</button>
                <button className="h-8 rounded-xl border px-3 text-sm"
                        onClick={()=> delPath([...path, idx])}>Удалить</button>
              </div>
            </div>
          </div>
        ))}
        <Help f={f}/>
        {thisErrs.length > 0 && (
          <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
            {thisErrs.map((e,i)=><li key={i}>{e}</li>)}
          </ul>
        )}
      </BlockFrame>
    );
  }

  // single complex
  const valueAtPath = getAtPath(state, path);

  // placeholder для необязательных одиночных (min=0, max=1)
  if ((min ?? 1) === 0 && (valueAtPath == null)) {
    return (
      <BlockFrame f={f} isBlock={isBlock} path={path}>
        <div className="text-xs text-zinc-500">
          Этот раздел необязателен. Нажмите «Добавить», чтобы заполнить.
        </div>
        <div>
          <button
            className="h-8 rounded-xl border px-3 text-sm"
            onClick={() => setPath(path, {})}
          >
            Добавить
          </button>
        </div>
        <Help f={f}/>
      {thisErrs.length > 0 && (
        <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
          {thisErrs.map((e,i)=><li key={i}>{e}</li>)}
        </ul>
      )}
      </BlockFrame>
    );
  }

  // заполненный (или обязательный) одиночный complex
  {
    // --- UI override для одиночного complex-блока (по текущему пути) ---
    const ui = useUiOverrides();
    const pk = pathKey(path);
    const npk = typeof normalizePathKey === "function" ? normalizePathKey(pk) : pk;
    const manualUi = ui.overrides?.widgets?.[npk] as (string|undefined);
    const manualMeta = manualUi ? (UI_COMPONENTS.find(x => x.id === manualUi) ?? null) : null;

    const childrenJsx = (
      <>
        {(f.children ?? []).map(child =>
          <FieldBlock key={child.name}
            f={child}
            path={[...path, child.name]}
            state={state} setPath={setPath} delPath={delPath}
            types={types} visitedTypes={nextVisited}
            errors={errors}
          />
        )}
        {(f.attributes ?? []).map(attr =>
          <FieldBlock key={`@${attr.name}`}
            f={attr}
            path={[...path, `@${attr.name}`]}
            state={state} setPath={setPath} delPath={delPath}
            types={types} visitedTypes={nextVisited}
            errors={errors}
          />
        )}
      </>
    );

    const wrappedChildren = (() => {
      if (manualMeta && canUseComponent(manualMeta, { f, isBlock: true })) {
        const Comp = manualMeta.Render as React.FC<any>;
        const childrenFields = (f.children ?? []) as FieldModel[];
        const renderChild = (child: FieldModel, childPath: (string|number)[]) => (
          <FieldBlock
            key={childPath.join(".")}
            f={child}
            path={childPath}
            state={state} setPath={setPath} delPath={delPath}
            types={types} visitedTypes={nextVisited}
            errors={errors}
          />
        );
        // фикс опечаток: "[.path" → "[...path", + типы в лямбде
        return (
          <Comp
            f={f}
            path={path}
            childrenFields={childrenFields}
            renderChild={(c: FieldModel, _p: (string|number)[])=>renderChild(c,[...path, c.name])} />
        );
      }
      return childrenJsx;
    })();

    // shallow-проверка обязательных в непосредственных детях
    const container = valueAtPath ?? {};
    const children = (f.children ?? []) as FieldModel[];
    const attrs = (f.attributes ?? []) as FieldModel[];
    const synth = (() => {
      let count = 0; const msgs: string[] = [];
      for (const ch of children) {
        const v = container?.[ch.name];
        const childPath = [...path, ch.name];
        const validatorHas = hasAnyValidatorErrors(errors, childPath);
        if (!validatorHas && shallowMissingForField(ch, v)) { count++; if (msgs.length < 3) msgs.push("Поле обязательно"); }
      }
      for (const at of attrs) {
        const v = container?.[`@${at.name}`];
        const attrPath = [...path, `@${at.name}`];
        const validatorHas = hasAnyValidatorErrors(errors, attrPath);
        if (!validatorHas && shallowMissingForField(at, v)) { count++; if (msgs.length < 3) msgs.push("Поле обязательно"); }
      }
      return { count, msgs };
    })();
    // используем верхнеуровневый subtreeErr
    const blockHasError = hasErrSub || synth.count > 0;

    return (
      <BlockFrame
        f={f}
        isBlock={isBlock}
        path={path}
        hasError={blockHasError}
        errsHere={thisErrs}
        errCount={subtreeErr.count + synth.count}
        errPreview={Array.from(new Set([...subtreeErr.preview, ...synth.msgs])).slice(0, 3)}
      >
        {wrappedChildren}
        {(f.minOccurs ?? 1) === 0 && (
          <div className="flex justify-end">
            <button
              className="h-8 rounded-xl border px-3 text-sm"
              onClick={() => delPath(path)}
            >
              Удалить раздел
            </button>
          </div>
        )}
        <Help f={f}/>
      </BlockFrame>
    );
  }
}

// Вспомогательный компонент диалога для редактирования подписей

function LabelEditorDialog(props: {
  open: boolean;
  onOpenChange: (v:boolean)=>void;
  pathKey: string | null;
  original: string | null;
  current?: string | null;
  onSave: (value: string | undefined) => void; // undefined → очистить override
}) {
  const [value, setValue] = React.useState<string>("");

  React.useEffect(() => {
    setValue(props.current ?? "");
  }, [props.current, props.open]);

  const showOriginal = props.original ?? "";

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактирование подписи поля</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-3 text-sm">
            <div><span className="text-zinc-500">Путь:</span> <code className="text-xs">{props.pathKey}</code></div>
            <div>
              <div className="text-zinc-500">Исходный текст</div>
              <div className="rounded border px-2 py-1 bg-zinc-50">{showOriginal}</div>
            </div>
            <div>
              <div className="text-zinc-500">Замещающий текст</div>
              <input
                type="text"
                className="mt-1 h-9 w-full rounded-[var(--radius)] border px-3 text-sm"
                value={value}
                placeholder="Оставьте пустым, чтобы использовать исходный текст"
                onChange={e => setValue(e.target.value)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Отмена</Button>
          </DialogClose>
          <Button
            onClick={() => {
              const trimmed = value.trim();
              props.onSave(trimmed === "" ? undefined : trimmed);
              props.onOpenChange(false);
            }}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ---------- root ----------

export function RenderRoot({ fields, types, stateCtl }: {
  fields: FieldModel[];
  types: Record<string, any>;
  stateCtl: ReturnType<typeof useFormState<any>>;
  errors?: Record<string, string[]>;
}) {
  const { state, setPath, delPath } = stateCtl;
  const { errors } = (arguments as any)[0] as { errors?: Record<string,string[]> };
  const visited = React.useMemo(()=> new Set<string>(), []);

  // небольшое in-memory хранилище «свернутости» по ключу пути
  const collapseStore = React.useRef<Map<string, boolean>>(new Map());
  const get = React.useCallback((k:string) => collapseStore.current.get(k), []);
  const set = React.useCallback((k:string, v:boolean) => { collapseStore.current.set(k, v); }, []);

  // --- АДАПТЕР к общему стору UI overrides со страницы ---
  const ui = useUiOverrides(); // {overrides, setOverrides, markDirty}
  const getLabel = React.useCallback((rawPk: string) => {
    const pk = normalizePathKey(rawPk);
    return ui.overrides?.labels?.[pk];
  }, [ui.overrides]);
  const hasLabel = React.useCallback((rawPk: string) => {
    const pk = normalizePathKey(rawPk);
    return Boolean(ui.overrides?.labels?.[pk]);
  }, [ui.overrides]);
  const setLabel = React.useCallback((rawPk: string, original: string, value: string | undefined) => {
    const pk = normalizePathKey(rawPk);
    const next = { ...(ui.overrides || {}) };
    next.labels = { ...(next.labels || {}) };
    if (value === undefined || value === "") {
      delete next.labels[pk];
    } else {
      next.labels[pk] = value;
    }
    ui.setOverrides(next);
    ui.markDirty();
  }, [ui]);

  // editor dialog (оставляем локально; хранит текущие значения формы)
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const dlgState = React.useRef<{ pathKey: string|null; original: string|null; current?: string|null }>({ pathKey:null, original:null, current:undefined });
  const openEditor = React.useCallback((args: { pathKey: string; original: string; current?: string }) => {
    dlgState.current = { ...args };
    setDlgOpen(true);
  }, []);


  return (
    <CollapseCtx.Provider value={{ get, set }}>
      <LabelOverridesCtx.Provider value={{
        items: [], // не используем, но тип требует
        getLabel,
        hasOverride: hasLabel,
        editLabel: (ov) => setLabel(ov.path, ov.original, ov.value),
        removeLabel: (rawPk) => setLabel(rawPk, "", undefined),
        openEditor,
      }}>
        <div className="space-y-4">
          {fields.map((f) =>
            <FieldBlock key={f.name} f={f} path={[f.name]} state={state} setPath={setPath} delPath={delPath}
              types={types} visitedTypes={visited} errors={errors}/>
          )}
        </div>
        <LabelEditorDialog
            open={dlgOpen}
            onOpenChange={setDlgOpen}
            pathKey={dlgState.current.pathKey}
            original={dlgState.current.original}
            current={dlgState.current.current}
            onSave={(value)=>{
            const raw = dlgState.current.pathKey!;
            const orig = dlgState.current.original ?? "";
            setLabel(raw, orig, value);
            }}
          />
      </LabelOverridesCtx.Provider>
    </CollapseCtx.Provider>
  );
}