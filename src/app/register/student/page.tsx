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
import { getPublicCourse } from "@/lib/courses/public";
import { registerStudent, registerViaCourse } from "@/lib/auth-actions";
import { homePathFor } from "@/lib/session";

export default async function RegisterStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect(homePathFor(session.user.role));

  const { course: courseSlug } = await searchParams;
  const course = courseSlug ? await getPublicCourse(courseSlug) : null;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <Link
          href={course ? `/c/${course.slug}` : "/register"}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Назад
        </Link>

        <h1 className="mt-3 text-xl font-semibold">Регистрация ученика</h1>

        {course ? (
          <p className="mt-2 text-sm text-muted">
            Вы записываетесь на курс «{course.title}». После регистрации заявка
            уйдёт преподавателю на подтверждение.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Можно зарегистрироваться без кода — тогда вы сразу попадёте в
            каталог и сможете записаться на любой открытый курс.
          </p>
        )}

        <div className="mt-6">
          {course ? (
            <AuthForm action={registerViaCourse} submitLabel="Зарегистрироваться">
              <input type="hidden" name="courseSlug" value={course.slug ?? ""} />
              <NameField />
              <EmailField />
              <PasswordField isNew />
            </AuthForm>
          ) : (
            <AuthForm action={registerStudent} submitLabel="Создать аккаунт">
              <NameField />
              <EmailField />
              <PasswordField isNew />
              <CodeField
                label="Код преподавателя (необязательно)"
                required={false}
                hint="Есть код от преподавателя — введите, и заявка уйдёт ему напрямую."
              />
            </AuthForm>
          )}
        </div>

        {!course && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-border" />
              или
              <span className="h-px flex-1 bg-border" />
            </div>

            <GoogleButton />
          </>
        )}
      </Card>
    </main>
  );
}
