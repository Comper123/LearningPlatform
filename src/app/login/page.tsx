import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthForm, EmailField, PasswordField } from "@/components/auth-forms";
import { GoogleButton } from "@/components/GoogleButton";
import { Card } from "@/components/ui";
import { loginWithPassword } from "@/lib/auth-actions";
import { homePathFor } from "@/lib/session";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect(homePathFor(session.user.role));

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold">Вход</h1>
        <p className="mt-2 text-sm text-muted">
          Преподаватель попадёт в панель, ученик — в свой кабинет.
        </p>

        <div className="mt-6">
          <AuthForm action={loginWithPassword} submitLabel="Войти">
            <EmailField />
            <PasswordField />
          </AuthForm>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          или
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton />

        <p className="mt-6 border-t border-border pt-4 text-sm text-muted">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </Card>
    </main>
  );
}
