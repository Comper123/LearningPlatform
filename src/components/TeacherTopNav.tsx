"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const main = [
  { href: "/dashboard", label: "Обзор" },
  { href: "/courses", label: "Курсы" },
];

const more = [
  { href: "/students", label: "Все ученики" },
  { href: "/groups", label: "Все группы" },
  { href: "/lessons", label: "Все занятия" },
  { href: "/assignments", label: "Все задания" },
  { href: "/tests", label: "Все тесты" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TeacherTopNav({ signOutButton }: { signOutButton: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const moreActive = more.some((m) => isActive(pathname, m.href));

  const linkCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition ${
      active
        ? "bg-accent-soft font-medium text-accent"
        : "text-muted hover:bg-surface-2 hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2 sm:gap-2">
        <Link
          href="/dashboard"
          className="mr-1 shrink-0 px-2 text-base font-semibold tracking-tight"
        >
          imlearning
        </Link>

        <nav className="flex min-w-0 items-center gap-1">
          {main.map((m) => (
            <Link key={m.href} href={m.href} className={linkCls(isActive(pathname, m.href))}>
              {m.label}
            </Link>
          ))}
        </nav>

        {/* Дропдаун вне nav: у nav нет overflow-контейнера, который бы его обрезал. */}
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className={linkCls(moreActive) + " flex items-center gap-1"}
          >
            Ещё
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div className="animate-pop absolute left-0 z-50 mt-1.5 min-w-[11rem] rounded-lg border border-border bg-surface p-1 shadow-pop">
              {more.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-md px-2.5 py-1.5 text-sm transition ${
                    isActive(pathname, m.href)
                      ? "bg-accent-soft text-accent"
                      : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  {m.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <span className="min-w-0 flex-1" />

        <Link
          href="/settings"
          className={linkCls(isActive(pathname, "/settings")) + " shrink-0"}
        >
          Профиль
        </Link>
        <div className="shrink-0">{signOutButton}</div>
      </div>
    </header>
  );
}
