import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getPublicCourse, studentCourseStatus } from "@/lib/courses/public";
import { cancelCourseRequest } from "@/lib/courses/public-actions";
import { findStudentByUser } from "@/lib/registration";

import { EnrollForm } from "./EnrollForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getPublicCourse(slug);
  return { title: course ? `${course.title} — imlearning` : "Курс не найден" };
}

export default async function PublicCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getPublicCourse(slug);

  if (!course) notFound();

  const session = await auth();
  const role = session?.user?.role ?? null;

  // Статус текущего зрителя-ученика по этому курсу.
  let status: Awaited<ReturnType<typeof studentCourseStatus>> | null = null;
  if (role === "student" && session?.user?.id) {
    const student = await findStudentByUser(session.user.id);
    if (student) status = await studentCourseStatus(student.id, course.id);
  }

  return (
    <>
      <Link href="/catalog" className="text-sm text-muted hover:text-foreground">
        ← Каталог
      </Link>

      <div className="mt-3">
        <PageHeader
          title={course.title}
          description={[course.level, `Преподаватель: ${course.teacherName}`]
            .filter(Boolean)
            .join(" · ")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          {course.description && (
            <section>
              <h2 className="mb-2 font-medium">О курсе</h2>
              <p className="text-sm whitespace-pre-line text-muted">
                {course.description}
              </p>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-medium">
              Программа{course.program.length ? ` · ${course.program.length} тем` : ""}
            </h2>
            {course.program.length === 0 ? (
              <EmptyState>Программа появится позже.</EmptyState>
            ) : (
              <ol className="grid gap-2">
                {course.program.map((topic, i) => (
                  <li key={topic.id}>
                    <Card className="p-4">
                      <p className="text-sm font-medium">
                        {i + 1}. {topic.title}
                      </p>
                      {topic.description && (
                        <p className="mt-1 text-sm text-muted">
                          {topic.description}
                        </p>
                      )}
                    </Card>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {course.teacherBio && (
            <section>
              <h2 className="mb-2 font-medium">Преподаватель</h2>
              <Card className="p-4">
                <p className="text-sm font-medium">{course.teacherName}</p>
                {course.teacherHeadline && (
                  <p className="text-xs text-muted">{course.teacherHeadline}</p>
                )}
                <p className="mt-2 text-sm whitespace-pre-line text-muted">
                  {course.teacherBio}
                </p>
              </Card>
            </section>
          )}
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="font-medium">Запись на курс</h2>

            <div className="mt-3 text-sm">
              {role === "teacher" ? (
                <p className="text-muted">
                  Вы преподаватель — записываться не нужно.
                </p>
              ) : !session?.user ? (
                <div className="grid gap-2">
                  <p className="text-muted">
                    Чтобы записаться, войдите или зарегистрируйтесь как ученик.
                  </p>
                  <Link
                    href={`/register/student?course=${course.slug}`}
                    className="rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-accent-fg transition hover:brightness-110"
                  >
                    Зарегистрироваться и записаться
                  </Link>
                  <Link
                    href="/login"
                    className="text-center text-xs text-muted hover:text-foreground"
                  >
                    У меня уже есть аккаунт
                  </Link>
                </div>
              ) : status?.enrolled ? (
                <p className="text-emerald-600 dark:text-emerald-400">
                  Вы уже учитесь на этом курсе.
                </p>
              ) : status?.requestStatus === "pending" ? (
                <div className="grid gap-2">
                  <p className="text-sky-600 dark:text-sky-400">
                    Заявка отправлена — ждёт решения преподавателя.
                  </p>
                  <form action={cancelCourseRequest}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <button
                      type="submit"
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Отозвать заявку
                    </button>
                  </form>
                </div>
              ) : status?.requestStatus === "approved" ? (
                <p className="text-emerald-600 dark:text-emerald-400">
                  Заявка одобрена.
                </p>
              ) : !course.enrollmentOpen ? (
                <p className="text-amber-600 dark:text-amber-400">
                  Запись на курс сейчас закрыта.
                </p>
              ) : (
                <>
                  {status?.requestStatus === "rejected" && (
                    <p className="mb-2 text-danger">
                      Прошлая заявка отклонена. Можно подать ещё раз.
                    </p>
                  )}
                  <EnrollForm courseId={course.id} />
                </>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
