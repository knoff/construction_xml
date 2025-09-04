import * as React from "react";
import type { FieldModel } from "./types";
import { inputKind, coerceValue } from "./controls";

// ---------- form-state ----------

export function useFormState<T extends object>(initial: T) {
  const [state, setState] = React.useState<T>(initial);
  const setPath = React.useCallback((path: (string|number)[], val: any) => {
    setState(prev => {
      const next: any = structuredClone(prev ?? {});
      let cur = next;
      for (let i=0; i<path.length-1; i++) {
        const k = path[i];
        cur[k] ??= typeof path[i+1] === "number" ? [] : {};
        cur = cur[k];
      }
      cur[path[path.length-1]] = val;
      return next;
    });
  }, []);
  const delPath = React.useCallback((path: (string|number)[]) => {
    setState(prev => {
      const next: any = structuredClone(prev ?? {});
      let cur = next;
      for (let i=0; i<path.length-1; i++) cur = cur[path[i]];
      const last = path[path.length-1];
      if (Array.isArray(cur)) cur.splice(Number(last), 1);
      else delete cur[last as any];
      return next;
    });
  }, []);
  return { state, setPath, delPath, setState };
}

// ---------- utils ----------

function isArrayMultiplicity(f: { maxOccurs?: number | null }) {
  const max = f.maxOccurs === null ? Infinity : (f.maxOccurs ?? 1);
  return max > 1 || f.maxOccurs === null;
}
function isRequiredField(f: { kind: string; minOccurs?: number; required?: boolean }) {
  if (f.kind === "attribute") return f.required === true;
  return (f.minOccurs ?? 1) >= 1;
}
function pathKey(path:(string|number)[]) {
  return path.map(p=>String(p)).join(".");
}
// DEBUG: show min/max; if max undefined or null → ∞
function minMaxText(f: FieldModel) {
  const min = f.minOccurs ?? 0;
  const maxDbg = (f.maxOccurs == null) ? "∞" : String(f.maxOccurs);
  return `(min=${min}, max=${maxDbg})`;
}

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
function BlockFrame(props:{
  f: FieldModel;
  isBlock: boolean;
  path: (string|number)[];
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  hasError?: boolean;
  errsHere?: string[];
}) {
  const { isBlock, f, path, headerExtra, children, hasError, errsHere } = props;
  const { get, set } = useCollapse();
  const k = pathKey(path);
  const [open, setOpen] = React.useState<boolean>(get(k) ?? true);
  React.useEffect(()=> set(k, open), [k, open, set]);

  // DEBUG: type name only for blocks (refType → complexType)
  const debugType = props.f && (props as any).f.refType ? `[type: ${(props as any).f.refType}]` : null;

  const Label = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="h-7 w-7 rounded border text-xs"
        onClick={()=> setOpen(o=>!o)}
        aria-label={open ? "Свернуть" : "Развернуть"}
      >
        {open ? "−" : "+"}
      </button>
      <label className="text-sm font-semibold">
        {(f.documentation?.label ?? f.name)}{" "}
        {isBlock && (
          <span className="text-[10px] text-zinc-500 ml-1">
            {minMaxText(f)} {debugType ? ` ${debugType}` : ""}
          </span>
        )}
        {isBlock && isRequiredField(f) ? " *" : ""}
      </label>
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

// ---------- small parts ----------

function FieldLabel({ f }: { f: FieldModel }) {
  const base = f.documentation?.label ?? f.name;
  const required = isRequiredField(f);
  return <label className="text-sm font-medium">{base}{required ? " *" : ""}</label>;
}
function Help({ f }: { f: FieldModel }) {
  const h = f.documentation?.help;
  return h ? <div className="text-xs text-zinc-500 mt-1">{h}</div> : null;
}
function SimpleInput({ f, value, onChange }: {
  f: FieldModel; value: any; onChange: (v:any)=>void;
}) {
  const kind = inputKind(f.dtype, f.facets);
  if (kind === "select") {
    const opts = f.facets?.enumOptions ?? (f.facets?.enum ?? []).map(v => ({ value: v }));
    return (
      <select className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
              value={value ?? ""} onChange={e => onChange(e.target.value)}>
        <option value="">— выберите —</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label ?? o.value}</option>)}
      </select>
    );
  }
  if (kind === "number") {
    return <input type="number" className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                  value={value ?? ""} onChange={e => onChange(coerceValue(f.dtype, e.target.value))} />;
  }
  if (kind === "date") {
    return <input type="date" className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                  value={value ?? ""} onChange={e => onChange(e.target.value)} />;
  }
  return <input type="text" className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                value={value ?? ""} onChange={e => onChange(e.target.value)} />;
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
  const hasErrSub = Object.keys(errors ?? {}).some(k => k === thisKey || k.startsWith(thisKey + "."));
  const nextVisited = React.useMemo(() => {
    const s = new Set(visitedTypes);
    if (props.f?.refType) s.add(props.f.refType);
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
      for (const opt of options) if (Object.prototype.hasOwnProperty.call(container, opt.name)) return opt.name;
      return null;
    };

    // single-choice
    if (!isArray) {
      const container = path.reduce((acc,k)=> acc?.[k], state);
      const selected = deriveSelected(container ?? {}) ?? options[0]?.name ?? null;
      React.useEffect(() => {
        const cur = path.reduce((acc,k)=> acc?.[k], state);
        if (!cur) { setPath(path, selected ? { [selected]: {} } : {}); return; }
        if (selected && !cur[selected]) { setPath(path, { ...(cur as any), [selected]: {} }); return; }
        if (cur) {
          let changed = false; const next: any = { ...(cur as any) };
          for (const opt of options) if (opt.name !== selected && next[opt.name]) { delete next[opt.name]; changed = true; }
          if (changed) setPath(path, next);
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [selected]);

      return (
        <div className="space-y-2">
          <FieldLabel f={{...f, documentation: f.documentation ?? {label: "Вариант"}} as any}/>
          <select className="h-9 rounded-[var(--radius)] border px-3 text-sm w-full"
                  value={selected ?? ""} onChange={(e)=>{
                    const next = e.target.value;
                    const base = path.reduce((acc,k)=> acc?.[k], state) ?? {};
                    if (!base[next] || Object.keys(base).length !== 1 || !Object.prototype.hasOwnProperty.call(base, next)) {
                      const cleared: any = {}; cleared[next] = base[next] ?? {};
                      setPath(path, cleared);
                    }
                  }}>
            {options.map(o => <option key={o.name} value={o.name}>{o.documentation?.label ?? o.name}</option>)}
          </select>
          {selected && (
            <div className="rounded-xl border p-3 space-y-3">
              {options.filter(o => o.name === selected).map(opt => (
                <FieldBlock key={opt.name} f={opt}
                  path={[...path, opt.name]} state={state} setPath={setPath} delPath={delPath}
                  types={types} visitedTypes={nextVisited}/>
              ))}
            </div>
          )}
        </div>
      );
    }

    // array-choice
    const rawAtPath = path.reduce((acc,k)=> acc?.[k], state);
    const items: any[] = Array.isArray(rawAtPath) ? rawAtPath : [];
    React.useEffect(() => {
      if (rawAtPath != null && !Array.isArray(rawAtPath)) setPath(path, []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Array.isArray(rawAtPath)]);

    return (
      <div className="space-y-2">
        <FieldLabel f={{...f, documentation: f.documentation ?? {label: "Варианты"}} as any}/>
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
    const rawAtPath = path.reduce((acc,k)=> acc?.[k], state);
    const items: any[] = Array.isArray(rawAtPath) ? rawAtPath : [];
    React.useEffect(() => {
      if (rawAtPath != null && !Array.isArray(rawAtPath)) setPath(path, []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Array.isArray(rawAtPath)]);
    return (
      <div className={`space-y-2 ${hasErrSub ? "border border-red-500 rounded-xl p-3" : ""}`}>
        <FieldLabel f={f}/>
        <div className="space-y-2">
          {items.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1">
                <SimpleInput f={f} value={val} onChange={(v)=> setPath([...path, idx], v)} />
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
    const val = path.reduce((acc,k)=> acc?.[k], state);
    return (
      <div className="space-y-1">
        <FieldLabel f={f}/>
        <SimpleInput f={f} value={val} onChange={(v)=> setPath(path, v)} />
        <Help f={f}/>
      </div>
    );
  }

  // complex / object
  const isArray = isArrayMultiplicity(f);
  const isBlock = !!(props.f?.refType && types?.[props.f.refType]?.kind === 'complexType');

  // array-complex
  if (isArray) {
    const rawAtPath = path.reduce((acc,k)=> acc?.[k], state);
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

    return (
      <BlockFrame f={f} isBlock={isBlock} path={path} headerExtra={headerExtra} hasError={hasErrSub} errsHere={thisErrs}>
        {items.map((_, idx) => (
          <div key={idx} className="rounded-xl border p-3 space-y-3 bg-white">
            {(f.children ?? []).map(child =>
              <FieldBlock key={child.name}
                f={child}
                path={[...path, idx, child.name]}
                state={state} setPath={setPath} delPath={delPath}
                types={types} visitedTypes={nextVisited}
              />
            )}
            {(f.attributes ?? []).map(attr =>
              <FieldBlock key={`@${attr.name}`}
                f={attr}
                path={[...path, idx, `@${attr.name}`]}
                state={state} setPath={setPath} delPath={delPath}
                types={types} visitedTypes={nextVisited}
              />
            )}
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
  const valueAtPath = path.reduce((acc,k)=> acc?.[k], state);

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
  return (
    <BlockFrame f={f} isBlock={isBlock} path={path} hasError={hasErrSub} errsHere={thisErrs}>
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

  return (
    <CollapseCtx.Provider value={{ get, set }}>
      <div className="space-y-4">
        {fields.map((f) =>
          <FieldBlock key={f.name} f={f} path={[f.name]} state={state} setPath={setPath} delPath={delPath}
            types={types} visitedTypes={visited} errors={errors}/>
        )}
      </div>
    </CollapseCtx.Provider>
  );
}
