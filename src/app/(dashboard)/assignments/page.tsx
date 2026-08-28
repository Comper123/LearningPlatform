import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { listAssignments } from "@/lib/assignments/queries";
import { allTopics } from "@/lib/courses/queries";
import { groupOptions } from "@/lib/groups/queries";
import { matchesQuery, num, pickSort, text } from "@/lib/list-utils";
import { requireTeacher } from "@/lib/session";

import { AssignmentForm } from "./AssignmentForm";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string; sort?: string; only?: string }>;
}) {
  const { q, group, sort, only } = await searchParams;
  const teacher = await requireTeacher();
  const [all, groups, topics] = await Promise.all([
    listAssignments(teacher.id),
    groupOptions(teacher.id),
    allTopics(teacher.id),
  ]);

  const assignments = all
    .filter(
      (a) =>
        matchesQuery(q, a.title, a.groupTitle) &&
        (!group || a.groupTitle === group) &&
        (only !== "pending" || Number(a.pending) > 0),
    )
    .sort(
      pickSort(sort, {
        recent: (a, b) => 0, // порядок из запроса (по createdAt desc)
        due: (a, b) =>
          (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity),
        pending: (a, b) => num(Number(b.pending), Number(a.pending)),
        title: (a, b) => text(a.title, b.title),
      }, "recent"),
    );

  return (
    <>
      <PageHeader
        title="Домашние задания"
        description={`Показано: ${assignments.length} из ${all.length}`}
      />

      <div className="mb-6">
        {groups.length === 0 ? (
          <EmptyState>
            Сначала создайте{" "}
            <Link href="/groups" className="text-accent">
              группу
            </Link>{" "}
            и запишите в неё учеников.
          </EmptyState>
        ) : (
          <AssignmentForm groups={groups} topics={topics} />
        )}
      </div>

      {all.length > 0 && (
        <ListControls
          search={{ placeholder: "Название или группа" }}
          filters={[
            {
              key: "group",
              label: "Любая группа",
              options: [
                { value: "", label: "Любая группа" },
                ...groups.map((g) => ({ value: g.title, label: g.title })),
              ],
            },
            {
              key: "only",
              label: "Все",
              options: [
                { value: "", label: "Все" },
                { value: "pending", label: "Есть на проверке" },
              ],
            },
          ]}
          sort={[
            { value: "recent", label: "Сначала новые" },
            { value: "due", label: "По сроку сдачи" },
            { value: "pending", label: "Больше на проверке" },
            { value: "title", label: "По названию" },
          ]}
        />
      )}

      {assignments.length === 0 ? (
        <EmptyState>
          {all.length === 0 ? "Заданий пока нет." : "Под фильтры ничего не подходит."}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {assignments.map((a) => (
            <Link
              key={a.id}
              href={`/assignments/${a.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-background"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {a.groupTitle ?? "Без группы"}
                  {a.dueAt && ` · до ${dateFormat.format(a.dueAt)}`}
                </p>
              </div>

              <div className="shrink-0 text-right text-xs text-muted">
                <p>Выдано: {a.total}</p>
                {Number(a.pending) > 0 && (
                  <p className="mt-0.5 text-sky-600 dark:text-sky-400">
                    На проверке: {a.pending}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
