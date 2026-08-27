import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { homePathFor } from "@/lib/session";

const paths = [
  {
    href: "/register/student",
    title: "Я ученик",
    description:
      "Нужен код приглашения от преподавателя — он даёт доступ именно к его группам.",
  },
  {
    href: "/register/teacher",
    title: "Я преподаватель",
    description:
      "Нужен ключ доступа к системе. Получите его у администратора центра.",
  },
];

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect(homePathFor(session.user.role));

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-semibold">Регистрация</h1>
        <p className="mt-2 text-sm text-muted">
          Выберите, кем вы входите в систему.
        </p>

        <div className="mt-6 grid gap-3">
          {paths.map((path) => (
            <Link key={path.href} href={path.href}>
              <Card className="p-5 transition hover:border-accent">
                <p className="font-medium">{path.title}</p>
                <p className="mt-1 text-sm text-muted">{path.description}</p>
              </Card>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}
