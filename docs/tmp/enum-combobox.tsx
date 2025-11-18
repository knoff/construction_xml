import * as React from "react";
import type { UiComponentProps } from "./registry";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Opt = { value: string; label?: string };

function normalize(s: string) {
  return s.normalize("NFKD").toLowerCase();
}

function presentTextForValue(opts: Opt[], v?: string | null) {
  if (!v) return "";
  const o = opts.find(x => x.value === v);
  return o ? (o.label ?? o.value) : v;
}

const EnumCombobox: React.FC<UiComponentProps & { options?: Opt[] }> = ({
  value,
  setValue,
  clearValue,
  f,
}) => {
  const opts: Opt[] =
    (f.facets?.enumOptions as Opt[] | undefined)
      ?? (f.facets?.enum ?? []).map((v: string) => ({ value: v }));

  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState<string>(presentTextForValue(opts, value as any));
  const [active, setActive] = React.useState(0);
  const suppressBlurCommitRef = React.useRef(false);

  // sync text when outer value changes
  React.useEffect(() => {
    setText(presentTextForValue(opts, value as any));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = React.useMemo(() => {
    const t = normalize(text.trim());
    if (!t) return opts;
    return opts.filter(o => {
      const lv = normalize(o.value);
      const ll = normalize(o.label ?? "");
      return lv.includes(t) || ll.includes(t);
    });
  }, [text, opts]);

  const commitFromText = React.useCallback(() => {
    const t = text.trim();
    if (t === "") { clearValue?.(); return; }
    // exact match label -> pick its value
    const byLabel = opts.find(o => (o.label ?? "") === t);
    if (byLabel) { setValue(byLabel.value); setText(byLabel.label ?? byLabel.value); return; }
    // exact match value
    const byValue = opts.find(o => o.value === t);
    if (byValue) { setValue(byValue.value); setText(byValue.label ?? byValue.value); return; }
    // no match -> revert to current valid representation
    setText(presentTextForValue(opts, value as any));
  }, [text, opts, value, setValue, clearValue]);

  const selectIndex = (i: number) => {
    const o = filtered[i];
    if (!o) return;
    setValue(o.value);
    setText(o.label ?? o.value);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <input
            type="text"
            className={cn("h-9 w-full rounded-[var(--radius)] border px-3 text-sm")}
            value={text}
            placeholder="Начните вводить..."
            onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); }}
            onBlur={() => {
              if (suppressBlurCommitRef.current) { suppressBlurCommitRef.current = false; return; }
              commitFromText();
            }}
            onKeyDown={(e) => {
              if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((p) => Math.min(p + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp")   { e.preventDefault(); setActive((p) => Math.max(p - 1, 0)); }
              if (e.key === "Enter")     { e.preventDefault(); if (open) selectIndex(active); else commitFromText(); }
              if (e.key === "Escape")    { setOpen(false); }
            }}
            aria-autocomplete="list"
            aria-expanded={open}
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(640px,90vw)] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onMouseDownCapture={() => { suppressBlurCommitRef.current = true; }}
          onPointerDownCapture={() => { suppressBlurCommitRef.current = true; }}
        >
          <ul className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-500">Ничего не найдено</li>
            )}
            {filtered.map((o, i) => {
              const activeCls = i === active ? "bg-zinc-100" : "hover:bg-zinc-50";
              return (
                <li
                  key={o.value}
                  className={cn("px-3 py-2 cursor-pointer text-sm flex items-center gap-2", activeCls)}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectIndex(i)}
                >
                  <span className="text-zinc-500">({o.value})</span>
                  <span>{o.label ?? o.value}</span>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EnumCombobox;
