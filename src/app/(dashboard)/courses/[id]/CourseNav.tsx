"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { seg: "", label: "Обзор" },
  { seg: "program", label: "Программа" },
  { seg: "groups", label: "Группы" },
  { seg: "lessons", label: "Занятия" },
  { seg: "homework", label: "Домашние задания" },
  { seg: "tests", label: "Тесты" },
  { seg: "students", label: "Ученики" },
  { seg: "publish", label: "Публикация" },
];

export function CourseNav({
  courseId,
  badges = {},
}: {
  courseId: string;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const base = `/courses/${courseId}`;

  return (
    <nav className="flex gap-0.5 overflow-x-auto md:flex-col md:overflow-visible">
      {sections.map((s) => {
        const href = s.seg ? `${base}/${s.seg}` : base;
        const active =
          s.seg === "" ? pathname === base : pathname.startsWith(href);
        const badge = badges[s.seg];

        return (
          <Link
            key={s.seg}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap transition ${
              active
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {s.label}
            {badge ? (
              <span className="rounded-full bg-accent px-1.5 text-xs text-accent-fg">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
