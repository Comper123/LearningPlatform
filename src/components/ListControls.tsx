"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Dropdown } from "@/components/Dropdown";

export type FilterConfig = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export type SortOption = { value: string; label: string };

/**
 * Единая панель поиска, фильтров и сортировки. Всё состояние живёт в URL
 * (`?q=`, `?<key>=`, `?sort=`), серверная страница просто читает searchParams.
 */
export function ListControls({
  search,
  filters = [],
  sort = [],
}: {
  search?: { placeholder?: string };
  filters?: FilterConfig[];
  sort?: SortOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) setParam("q", q);
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeCount =
    (q ? 1 : 0) +
    filters.filter((f) => params.get(f.key)).length +
    (sort.length > 0 && params.get("sort") ? 1 : 0);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface p-1.5">
      {search && (
        <div className="flex min-w-[11rem] flex-1 items-center gap-2 px-2">
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-muted"
            aria-hidden
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M13 13l-2.5-2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={search.placeholder ?? "Поиск"}
            className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted/70"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="text-muted transition hover:text-foreground"
              aria-label="Очистить поиск"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {(filters.length > 0 || sort.length > 0) && search && (
        <div className="mx-0.5 h-6 w-px bg-border max-sm:hidden" />
      )}

      {filters.map((f) => (
        <Dropdown
          key={f.key}
          placeholder={f.label}
          value={params.get(f.key) ?? ""}
          onChange={(v) => setParam(f.key, v)}
          options={f.options}
        />
      ))}

      {sort.length > 0 && (
        <Dropdown
          prefix="Сортировка:"
          placeholder={sort[0].label}
          value={params.get("sort") ?? sort[0].value}
          onChange={(v) => setParam("sort", v)}
          options={sort}
          align="right"
        />
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.replace(pathname, { scroll: false });
          }}
          className="ml-auto rounded-lg px-2.5 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          Сбросить ({activeCount})
        </button>
      )}
    </div>
  );
}
