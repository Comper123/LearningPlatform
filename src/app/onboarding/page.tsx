import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { Card } from "@/components/ui";
import { findStudentByUser } from "@/lib/registration";
import { homePathFor, requireUser } from "@/lib/session";

import { OnboardingForms } from "./OnboardingForms";

export default async function OnboardingPage() {
  const user = await requireUser();

  if (user.role === "teacher") redirect(homePathFor(user.role));

  // Ученик без карточки тоже остаётся здесь — иначе он и его кабинет
  // отправляли бы друг к другу по кругу.
  if (user.role === "student" && (await findStudentByUser(user.id))) {
    redirect("/me");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-semibold">Кто вы в системе?</h1>
        <p className="mt-2 text-sm text-muted">
          Вы вошли как {user.email}. Осталось подтвердить роль — просто выбрать
          её нельзя, для каждой нужен свой код.
        </p>

        <OnboardingForms defaultName={user.name ?? ""} />

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
