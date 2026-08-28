import Link from "next/link";

import { auth } from "@/auth";
import { homePathFor } from "@/lib/session";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link href="/catalog" className="font-semibold tracking-tight">
            imlearning
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link href="/catalog" className="text-muted hover:text-foreground">
              Каталог
            </Link>
            {session?.user ? (
              <Link
                href={homePathFor(session.user.role)}
                className="text-accent hover:underline"
              >
                Кабинет
              </Link>
            ) : (
              <Link href="/login" className="text-accent hover:underline">
                Войти
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
