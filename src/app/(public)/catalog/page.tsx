import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { listPublicCourses } from "@/lib/courses/public";
import { matchesQuery, pickSort, text } from "@/lib/list-utils";

export const metadata = { title: "Каталог курсов — imlearning" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; open?: string; sort?: string }>;
}) {
  const { q, level, open, sort } = await searchParams;
  const all = await listPublicCourses();

  const levels = [...new Set(all.map((c) => c.level).filter(Boolean))] as string[];

  const courses = all
    .filter(
      (c) =>
        matchesQuery(q, c.title, c.description, c.teacherName) &&
        (!level || c.level === level) &&
        (open !== "1" || c.enrollmentOpen),
    )
    .sort(
      pickSort(sort, {
        title: (a, b) => text(a.title, b.title),
        teacher: (a, b) => text(a.teacherName ?? "", b.teacherName ?? ""),
      }, "title"),
    );

  return (
    <>
      <PageHeader
        title="Каталог курсов"
        description={`Открытых курсов: ${all.length}`}
      />

      {all.length > 0 && (
        <ListControls
          search={{ placeholder: "Название, описание, преподаватель" }}
          filters={[
            ...(levels.length
              ? [
                  {
                    key: "level",
                    label: "Любой уровень",
                    options: [
                      { value: "", label: "Любой уровень" },
                      ...levels.map((l) => ({ value: l, label: l })),
                    ],
                  },
                ]
              : []),
            {
              key: "open",
              label: "Все",
              options: [
                { value: "", label: "Все" },
                { value: "1", label: "Только с открытой записью" },
              ],
            },
          ]}
          sort={[
            { value: "title", label: "По названию" },
            { value: "teacher", label: "По преподавателю" },
          ]}
        />
      )}

      {courses.length === 0 ? (
        <EmptyState>
          {all.length === 0
            ? "Пока нет опубликованных курсов."
            : "Под фильтры ничего не подходит."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Link key={course.id} href={`/c/${course.slug}`}>
              <Card className="h-full p-5 transition hover:border-accent">
                <h2 className="font-medium">{course.title}</h2>
                {course.level && (
                  <p className="mt-1 text-xs text-muted">{course.level}</p>
                )}
                {course.description && (
                  <p className="mt-3 line-clamp-3 text-sm text-muted">
                    {course.description}
                  </p>
                )}
                <p className="mt-4 text-xs text-muted">
                  {course.teacherName}
                  {course.teacherHeadline ? ` · ${course.teacherHeadline}` : ""}
                </p>
                {!course.enrollmentOpen && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Запись закрыта
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
