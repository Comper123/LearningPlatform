import Link from "next/link";

import { signOut } from "@/auth";
import { NavLink } from "@/components/NavLink";
import { requireTeacher } from "@/lib/session";

const nav = [
  { href: "/dashboard", label: "Обзор" },
  { href: "/students", label: "Ученики" },
  { href: "/groups", label: "Группы" },
  { href: "/courses", label: "Курсы" },
  { href: "/lessons", label: "Занятия" },
  { href: "/assignments", label: "Домашние задания" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacher = await requireTeacher();

  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <Link
          href="/dashboard"
          className="px-3 py-2 text-lg font-semibold tracking-tight"
        >
          imlearning
        </Link>

        <nav className="mt-6 flex flex-col gap-0.5">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="mt-auto border-t border-border pt-4">
          <p className="truncate px-3 text-xs text-muted">{teacher.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
            >
              Выйти
            </button>
          </form>
        </div>
      </aside>

      {/* Мобильная навигация: горизонтальная лента вместо боковой панели. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 md:hidden">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <main className="flex-1 p-5 md:p-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
