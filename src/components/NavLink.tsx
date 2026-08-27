"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Пункт бокового меню с подсветкой текущего раздела. */
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
        active
          ? "bg-accent-soft font-medium text-accent"
          : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
