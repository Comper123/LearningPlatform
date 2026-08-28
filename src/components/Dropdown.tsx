"use client";

import { useEffect, useId, useRef, useState } from "react";

export type DropdownOption = { value: string; label: string };

/**
 * Компактный кастомный дропдаун для фильтров и сортировки. Не форма —
 * работает через value/onChange. Клавиатура: стрелки, Enter, Esc, Home/End.
 */
export function Dropdown({
  options,
  value,
  onChange,
  placeholder,
  prefix,
  align = "left",
}: {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  /** Текст, когда ничего не выбрано (для фильтров — имя фильтра). */
  placeholder: string;
  /** Приписка перед значением, например «Сортировка:». */
  prefix?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const isSet = !!selected && selected.value !== "";

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setActive(idx < 0 ? 0 : idx);

    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, options, value]);

  function commit(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) commit(options[active].value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
          isSet
            ? "bg-accent-soft text-accent"
            : "text-muted hover:bg-surface-2 hover:text-foreground"
        } ${open ? "ring-1 ring-accent" : ""}`}
      >
        {prefix && <span className="text-muted">{prefix}</span>}
        <span className={isSet || prefix ? "font-medium" : ""}>
          {isSet ? selected!.label : placeholder}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={`animate-pop absolute z-50 mt-1.5 max-h-64 min-w-[11rem] overflow-auto rounded-lg border border-border bg-surface p-1 shadow-pop ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li key={o.value || "__all"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(o.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                    i === active ? "bg-accent-soft text-foreground" : "text-foreground"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                      className="shrink-0 text-accent"
                    >
                      <path
                        d="M3.5 8.5l3 3 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
