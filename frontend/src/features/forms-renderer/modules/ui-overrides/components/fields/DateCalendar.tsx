// frontend/src/features/forms/ui/date-calendar.tsx
import * as React from "react";
import type { UiComponentProps } from "../../core/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { XIcon, CalendarIcon } from "lucide-react";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ISO "YYYY-MM-DD" -> Date
function parseISO(s: unknown): Date | undefined {
  if (typeof s !== "string") return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? undefined : d;
}

// "DD.MM.YYYY" -> Date
function parseDMY(s: string): Date | undefined {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  if (!m) return undefined;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? undefined : d;
}

// Date -> ISO "YYYY-MM-DD"
function toISO(d?: Date): string | undefined {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Date -> "DD.MM.YYYY"
function toDMY(d?: Date): string {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}.${m}.${y}`;
}

// Нормализация вставки: любой "мусор" -> DD.MM.YYYY (если хватает цифр)
function normalizePastedDMY(raw: string): string {
  const digits = (raw || "").replace(/\D+/g, "");
  if (digits.length < 8) return ""; // недостаточно цифр для даты
  // Берём первые 8 цифр
  const eight = digits.slice(0, 8);
  // Если начало похоже на год (1900..2100), считаем формат YYYYMMDD
  const maybeYear = Number(eight.slice(0, 4));
  let dd: string, mm: string, yyyy: string;
  if (maybeYear >= 1900 && maybeYear <= 2100) {
    yyyy = eight.slice(0, 4);
    mm   = eight.slice(4, 6);
    dd   = eight.slice(6, 8);
  } else {
    dd   = eight.slice(0, 2);
    mm   = eight.slice(2, 4);
    yyyy = eight.slice(4, 8);
  }
  return `${dd}.${mm}.${yyyy}`;
}

export const DateCalendar: React.FC<UiComponentProps> = ({ value, setValue, clearValue }) => {
  const [open, setOpen] = React.useState(false);
  // если клик был внутри поповера (календаря) — не коммитим по blur
  const suppressBlurCommitRef = React.useRef(false);

  // внешнее значение формы (ISO) -> дата
  const iso = typeof value === "string" ? value : undefined;
  const fromIso = parseISO(iso);

  // текст инпута; держим синхронизированным с внешним value
  const [text, setText] = React.useState<string>(toDMY(fromIso));
  React.useEffect(() => {
    setText(toDMY(parseISO(typeof value === "string" ? value : undefined)));
  }, [value]);

  // выбранная дата — берем из текста (если валидно), иначе — из ISO
  const selected = parseDMY(text) ?? fromIso;

  const commitFromText = () => {
    const d = parseDMY(text);
    if (d) {
      setValue(toISO(d));      // в форму — ISO
      setText(toDMY(d));       // нормализуем текст
    } else if (text.trim() === "") {
      clearValue?.();
    } else {
      // неверный формат — откатиться на прежнее внешнее значение
      setText(toDMY(fromIso));
    }
  };

  // мягкая маска ввода: авто-точки и отсечение лишнего
  const handleChange = (raw: string) => {
    const v = raw.replace(/[^\d.]/g, "");
    let vv = v.slice(0, 10);
    if (/^\d{3}$/.test(vv)) vv = vv.slice(0, 2) + "." + vv.slice(2);
    if (/^\d{2}\.\d{3}$/.test(vv)) vv = vv.slice(0, 5) + "." + vv.slice(5);
    setText(vv);
  };

  return (
    <div className="w-full max-w-[280px]">
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          {/* ВАЖНО: ни onFocus, ни onClick не открывают поповер — это делает сам Radix через Trigger */}
          <PopoverTrigger asChild>
            <input
              type="text"
              inputMode="numeric"
              placeholder="ДД.ММ.ГГГГ"
              className={cn(
                "h-9 w-full rounded-[var(--radius)] border px-9 pr-20 text-sm",
                "placeholder:text-muted-foreground"
              )}
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              onPaste={(e) => {
                // "умная" вставка: преобразуем в DD.MM.YYYY
                const clip = e.clipboardData?.getData("text") ?? "";
                const norm = normalizePastedDMY(clip);
                if (norm) {
                  e.preventDefault();
                  setText(norm);
                }
                // если нормализации не хватило (меньше 8 цифр) — даём стандартной вставке пройти
              }}
              onBlur={(e) => {
                // если blur случился из-за клика по календарю — пропускаем commit
                if (suppressBlurCommitRef.current) {
                  suppressBlurCommitRef.current = false;
                  return;
                }
                commitFromText();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitFromText();
                  setOpen(false);
                }
              }}
              aria-label="Дата"
            />
          </PopoverTrigger>

          {/* иконки справа/слева поверх инпута */}
          <CalendarIcon
            className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          {text && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
              title="Очистить"
              onMouseDown={(e) => e.preventDefault()} // не теряем фокус до клика
              onClick={() => {
                setText("");
                clearValue?.();
              }}
            >
              <XIcon className="size-4" />
            </button>
          )}

          <PopoverContent
            align="start"
            className="w-auto p-0"
            // Никуда не переводим фокус при открытии/закрытии → не будет повторного открытия
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            // первый клик внутри поповера не должен триггерить commit по blur
            onMouseDownCapture={() => { suppressBlurCommitRef.current = true; }}
            onPointerDownCapture={() => { suppressBlurCommitRef.current = true; }}
          >
            <Calendar
              mode="single"
              selected={selected}
              month={selected ?? new Date()}   // сразу показываем выбранный месяц
              required
              onSelect={(d) => {
                // Повторный клик по выбранной дате в DayPicker (mode="single")
                // по умолчанию снимает выбор -> d === undefined. Нам это не нужно.
                if (!d) { setOpen(false); return; }
                setValue(toISO(d));
                setText(toDMY(d));
                setOpen(false);
              }}
              captionLayout="dropdown"
              locale={ru}              // локализация на русский
              showOutsideDays          // как в shadcn
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};


