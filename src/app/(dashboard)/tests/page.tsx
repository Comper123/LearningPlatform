import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { matchesQuery, num, pickSort, text } from "@/lib/list-utils";
import { requireTeacher } from "@/lib/session";
import { listTests } from "@/lib/tests/queries";

import { TestForm } from "./TestForm";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const { q, status, sort } = await searchParams;
  const teacher = await requireTeacher();
  const all = await listTests(teacher.id);

  const rows = all
    .filter(
      (t) => matchesQuery(q, t.title) && (!status || t.status === status),
    )
    .sort(
      pickSort(sort, {
        recent: () => 0,
        title: (a, b) => text(a.title, b.title),
        questions: (a, b) => num(Number(b.questionCount), Number(a.questionCount)),
      }, "recent"),
    );

  return (
    <>
      <PageHeader
        title="Тесты"
        description={`Показано: ${rows.length} из ${all.length}`}
      />

      <div className="mb-6">
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
            { value: "questions", label: "Больше вопросов" },
          ]}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState>
          {all.length === 0
            ? "Тестов пока нет — создайте первый."
            : "Под фильтры ничего не подходит."}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((test) => (
            <Link
              key={test.id}
              href={`/tests/${test.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{test.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {test.questionCount} вопр.
                  {test.timeLimitMin ? ` · ${test.timeLimitMin} мин` : " · без лимита"}
                  {test.closesAt
                    ? ` · до ${dateFormat.format(test.closesAt)}`
                    : ""}
                </p>
              </div>

              <Badge
                label={test.status === "published" ? "Опубликован" : "Черновик"}
                style={
                  test.status === "published"
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
