import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  AuthForm,
  CodeField,
  EmailField,
  NameField,
  PasswordField,
} from "@/components/auth-forms";
import { GoogleButton } from "@/components/GoogleButton";
import { Card } from "@/components/ui";
import { registerTeacher } from "@/lib/auth-actions";
import { homePathFor } from "@/lib/session";

export default async function RegisterTeacherPage() {
  const session = await auth();
  if (session?.user) redirect(homePathFor(session.user.role));

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <Link href="/register" className="text-sm text-muted hover:text-foreground">
          ← Назад
        </Link>

        <h1 className="mt-3 text-xl font-semibold">Регистрация преподавателя</h1>
        <p className="mt-2 text-sm text-muted">
          Роль преподавателя нельзя выбрать просто так: нужен ключ доступа
          или адрес из списка преподавателей центра.
        </p>

        <div className="mt-6">
          <AuthForm action={registerTeacher} submitLabel="Создать аккаунт">
            <NameField />
            <EmailField />
            <PasswordField isNew />
            <CodeField
              label="Ключ доступа"
              required={false}
              hint="Можно не заполнять, если ваш email уже в списке преподавателей."
            />
          </AuthForm>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          или
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton />
      </Card>
    </main>
  );
}
