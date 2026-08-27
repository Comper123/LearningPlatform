import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { Card } from "@/components/ui";
import { findStudentByUser } from "@/lib/registration";
import { homePathFor, requireUser } from "@/lib/session";

/** Экран для ученика, чья заявка ещё не рассмотрена или отклонена. */
export default async function StatusPage() {
  const user = await requireUser();

  if (user.role === "teacher") redirect(homePathFor(user.role));

  const student = await findStudentByUser(user.id);
  if (!student) redirect("/onboarding");
  if (student.status !== "pending" && student.status !== "rejected") {
    redirect("/me");
  }

  const waiting = student.status === "pending";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-semibold">
          {waiting ? "Заявка отправлена" : "Заявка отклонена"}
        </h1>

        <p className="mt-3 text-sm text-muted">
          {waiting
            ? "Преподаватель должен подтвердить зачисление. Как только он примет заявку, здесь откроется ваш кабинет с занятиями и домашними заданиями."
            : "Преподаватель отклонил заявку. Если это ошибка, свяжитесь с ним — он может принять её из своей панели."}
        </p>

        <p className="mt-4 text-xs text-muted">
          Вы вошли как {student.fullName}
          {student.email && ` · ${student.email}`}
        </p>

        <form
          className="mt-6 border-t border-border pt-4"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-muted transition hover:text-foreground"
          >
            Выйти
          </button>
        </form>
      </Card>
    </main>
  );
}
