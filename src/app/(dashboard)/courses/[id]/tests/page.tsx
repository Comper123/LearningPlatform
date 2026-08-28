import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Badge, Card, EmptyState } from "@/components/ui";
import { listCourseTests } from "@/lib/courses/teacher-workspace";
import { matchesQuery, num, pickSort, text } from "@/lib/list-utils";
import { requireTeacher } from "@/lib/session";

import { TestForm } from "../../../tests/TestForm";

export default async function CourseTestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const { id } = await params;
  const { q, status, sort } = await searchParams;
  const teacher = await requireTeacher();

  const all = await listCourseTests(teacher.id, id);

  const rows = all
    .filter(
      (t) => matchesQuery(q, t.title) && (!status || t.status === status),
    )
    .sort(
      pickSort(sort, {
        recent: () => 0,
        title: (a, b) => text(a.title, b.title),
        attempts: (a, b) => num(Number(b.attempts), Number(a.attempts)),
      }, "recent"),
    );

  return (
    <>
      <h2 className="mb-1 font-medium">Тесты курса</h2>
      <p className="mb-4 text-sm text-muted">
        Здесь тесты, назначенные группам этого курса. Новый тест после создания
        нужно назначить группе в его настройках.
      </p>

      <div className="mb-5">
        <TestForm />
      </div>

      {all.length > 0 && (
        <ListControls
          search={{ placeholder: "Название теста" }}
          filters={[
            {
              key: "status",
              label: "Любой статус",
              options: [
                { value: "", label: "Любой статус" },
                { value: "published", label: "Опубликован" },
                { value: "draft", label: "Черновик" },
              ],
            },
          ]}
          sort={[
            { value: "recent", label: "Сначала новые" },
            { value: "title", label: "По названию" },
            { value: "attempts", label: "Больше попыток" },
          ]}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState>
          {all.length === 0
            ? "Группам курса ещё не назначен ни один тест."
            : "Под фильтры ничего не подходит."}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((t) => (
            <Link
              key={t.id}
              href={`/tests/${t.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {t.questionCount} вопр.
                  {t.timeLimitMin ? ` · ${t.timeLimitMin} мин` : ""}
                  {Number(t.attempts) > 0 ? ` · попыток: ${t.attempts}` : ""}
                </p>
              </div>
              <Badge
                label={t.status === "published" ? "Опубликован" : "Черновик"}
                style={
                  t.status === "published"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-zinc-500/10 text-muted"
                }
              />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
