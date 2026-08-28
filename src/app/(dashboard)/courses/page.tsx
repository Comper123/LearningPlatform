import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { listCourses } from "@/lib/courses/queries";
import { matchesQuery, num, pickSort, text } from "@/lib/list-utils";
import { requireTeacher } from "@/lib/session";

import { CourseForm } from "./CourseForm";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vis?: string; sort?: string }>;
}) {
  const { q, vis, sort } = await searchParams;
  const teacher = await requireTeacher();
  const all = await listCourses(teacher.id);

  const courses = all
    .filter(
      (c) =>
        matchesQuery(q, c.title, c.description, c.level) &&
        (!vis ||
          (vis === "public" ? c.isPublic : !c.isPublic)),
    )
    .sort(
      pickSort(sort, {
        title: (a, b) => text(a.title, b.title),
        topics: (a, b) => num(Number(b.topicCount), Number(a.topicCount)),
      }, "title"),
    );

  return (
    <>
      <PageHeader
        title="Курсы"
        description="Всё по обучению — внутри курса"
        action={
          <Link
            href="/groups"
            className="text-sm text-muted hover:text-foreground"
          >
            Группы без курса →
          </Link>
        }
      />

      <div className="mb-6">
        <CourseForm />
      </div>

      {all.length > 0 && (
        <ListControls
          search={{ placeholder: "Название, уровень, описание" }}
          filters={[
            {
              key: "vis",
              label: "Любой",
              options: [
                { value: "", label: "Любой" },
                { value: "public", label: "Публичные" },
                { value: "private", label: "Только для своих" },
              ],
            },
          ]}
          sort={[
            { value: "title", label: "По названию" },
            { value: "topics", label: "Больше тем" },
          ]}
        />
      )}

      {courses.length === 0 ? (
        <EmptyState>
          {all.length === 0
            ? "Курсов пока нет. Создайте курс — внутри него группы, занятия, задания и тесты."
            : "Под фильтры ничего не подходит."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="h-full p-5 transition hover:border-accent">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">{course.title}</h2>
                  {course.isPublic && (
                    <Badge
                      label="в каталоге"
                      style="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    />
                  )}
                </div>
                {course.level && (
                  <p className="mt-1 text-xs text-muted">{course.level}</p>
                )}
                {course.description && (
                  <p className="mt-3 line-clamp-3 text-sm text-muted">
                    {course.description}
                  </p>
                )}
                <p className="mt-4 text-xs text-muted">
                  Тем в программе: {course.topicCount}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
