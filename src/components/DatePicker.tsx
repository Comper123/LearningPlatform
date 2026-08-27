"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { controlClass } from "@/components/ui";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const MONTHS_OF = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const pad = (n: number) => String(n).padStart(2, "0");

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Разбирает "YYYY-MM-DD" или "YYYY-MM-DDTHH:mm" без сдвига часового пояса. */
function parseValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return null;

  const [, y, m, d, hh, mm] = match;
  return {
    date: new Date(Number(y), Number(m) - 1, Number(d)),
    time: hh ? `${hh}:${mm}` : null,
  };
}

/** Понедельник — первый день недели, поэтому воскресенье сдвигаем в конец. */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

/**
 * Поле даты со своим календарём. В форму уходит скрытое поле в том же
 * формате, что и у нативного input: "YYYY-MM-DD" либо "YYYY-MM-DDTHH:mm".
 */
export function DatePicker({
  name,
  defaultValue = "",
  withTime = false,
  defaultTime = "12:00",
  placeholder = "Не выбрано",
  className = "",
}: {
  name: string;
  defaultValue?: string;
  withTime?: boolean;
  defaultTime?: string;
  placeholder?: string;
  className?: string;
}) {
  const initial = parseValue(defaultValue);

  const [selected, setSelected] = useState<Date | null>(initial?.date ?? null);
  const [time, setTime] = useState(initial?.time ?? defaultTime);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => initial?.date ?? new Date());

  const rootRef = useRef<HTMLDivElement>(null);

  const value = selected
    ? withTime
      ? `${toDateKey(selected)}T${time}`
      : toDateKey(selected)
    : "";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Сетка на шесть недель — высота календаря не скачет между месяцами.
  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - mondayIndex(first));

    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [view]);

  const todayKey = toDateKey(new Date());
  const selectedKey = selected ? toDateKey(selected) : null;

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  function pick(day: Date) {
    setSelected(day);
    setView(day);
    if (!withTime) setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${controlClass} flex items-center justify-between gap-2 text-left ${
          open ? "border-accent" : ""
        }`}
      >
        <span className={selected ? "" : "text-muted"}>
          {selected
            ? `${selected.getDate()} ${MONTHS_OF[selected.getMonth()]} ${selected.getFullYear()}` +
              (withTime ? `, ${time}` : "")
            : placeholder}
        </span>
        <CalendarIcon />
      </button>

      {open && (
        <div className="animate-pop absolute z-50 mt-1.5 w-[19rem] rounded-xl border border-border bg-surface p-3 shadow-pop">
          <div className="flex items-center justify-between">
            <ArrowButton label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>
              ‹
            </ArrowButton>

            <span className="text-sm font-medium">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>

            <ArrowButton label="Следующий месяц" onClick={() => shiftMonth(1)}>
              ›
            </ArrowButton>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="pb-1 text-center text-xs font-medium text-muted"
              >
                {weekday}
              </div>
            ))}

            {days.map((day) => {
              const key = toDateKey(day);
              const outside = day.getMonth() !== view.getMonth();
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(day)}
                  className={`h-9 rounded-md text-sm transition ${
                    isSelected
                      ? "bg-accent font-medium text-accent-fg"
                      : outside
                        ? "text-muted/45 hover:bg-surface-2"
                        : "hover:bg-surface-2"
                  } ${isToday && !isSelected ? "font-semibold text-accent" : ""}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <span className="text-sm text-muted">Время</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value || defaultTime)}
                className={`${controlClass} w-auto flex-1`}
              />
            </div>
          )}

          <div className="mt-3 flex justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={() => pick(new Date())}
              className="rounded-md px-2 py-1 text-sm text-accent transition hover:bg-accent-soft"
            >
              Сегодня
            </button>

            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-sm text-muted transition hover:text-foreground"
            >
              Очистить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-muted transition hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0 text-muted"
    >
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
