import Link from "next/link";

import { signOut } from "@/auth";
import { requireStudent } from "@/lib/session";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { student } = await requireStudent();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <p className="font-semibold">imlearning</p>
          <p className="text-xs text-muted">{student.fullName}</p>
        </div>

        <div className="flex items-center gap-5 text-sm">
          <Link href="/me" className="text-muted transition hover:text-foreground">
            Кабинет
          </Link>
          <Link
            href="/me/homework"
            className="text-muted transition hover:text-foreground"
          >
            Домашние задания
          </Link>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-muted transition hover:text-foreground"
            >
              Выйти
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
