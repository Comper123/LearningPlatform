import Link from "next/link";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { listStudentCourseRequests } from "@/lib/courses/public";
import { listEnrolledCourses } from "@/lib/courses/workspace";
import { requireStudent } from "@/lib/session";

export default async function StudentHomePage() {
  const { student } = await requireStudent();

  const [enrolled, requests] = await Promise.all([
    listEnrolledCourses(student.id),
    listStudentCourseRequests(student.id),
  ]);

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <>
      <PageHeader
        title="Мои курсы"
        description="Всё по каждому курсу — на его странице"
        action={
          <Link
            href="/catalog"
            className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-surface-2"
          >
            Каталог курсов
          </Link>
        }
      />

      {enrolled.length === 0 ? (
        <EmptyState>
          Вы пока не записаны ни на один курс.{" "}
          <Link href="/catalog" className="text-accent hover:underline">
            Открыть каталог
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {enrolled.map((course) => (
            <Link key={course.id} href={`/me/courses/${course.id}`}>
              <Card className="h-full p-5 transition hover:border-accent">
                <h2 className="font-medium">{course.title}</h2>
                {course.level && (
                  <p className="mt-1 text-xs text-muted">{course.level}</p>
                )}
                <p className="mt-3 text-sm text-muted">
                  Группа: {course.groupTitle}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Преподаватель: {course.teacherName}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-medium">Заявки на курсы</h2>
          <Card className="divide-y divide-border">
            {pending.map((r) => (
              <p key={r.courseId} className="px-4 py-3 text-sm">
                {r.courseTitle}
                <span className="ml-2 text-xs text-sky-600 dark:text-sky-400">
                  ждёт подтверждения
                </span>
              </p>
            ))}
          </Card>
        </section>
      )}
    </>
  );
}
