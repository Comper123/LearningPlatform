import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Card, EmptyState } from "@/components/ui";
import { listCourseGroups, listTopics } from "@/lib/courses/queries";
import { listCourseAssignments } from "@/lib/courses/teacher-workspace";
import { matchesQuery, num, pickSort, text } from "@/lib/list-utils";
import { requireTeacher } from "@/lib/session";

import { AssignmentForm } from "../../../assignments/AssignmentForm";

const fmt = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function CourseHomeworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; group?: string; only?: string; sort?: string }>;
}) {
  const { id } = await params;
  const { q, group, only, sort } = await searchParams;
  await requireTeacher();

  const [all, groups, topics] = await Promise.all([
    listCourseAssignments(id),
    listCourseGroups(id),
    listTopics(id),
  ]);

  const rows = all
    .filter(
      (a) =>
        matchesQuery(q, a.title, a.groupTitle) &&
        (!group || a.groupTitle === group) &&
        (only !== "pending" || Number(a.pending) > 0),
    )
    .sort(
      pickSort(sort, {
        recent: () => 0,
        due: (a, b) =>
          (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity),
        pending: (a, b) => num(Number(b.pending), Number(a.pending)),
        title: (a, b) => text(a.title, b.title),
      }, "recent"),
    );

  return (
    <>
      <h2 className="mb-4 font-medium">Домашние задания курса</h2>

      <div className="mb-5">
        {groups.length === 0 ? (
          <EmptyState>Сначала создайте группу — во вкладке «Группы».</EmptyState>
        ) : (
          <AssignmentForm
            groups={groups.map((g) => ({ id: g.id, title: g.title, courseId: id }))}
            topics={topics.map((t) => ({ id: t.id, title: t.title, courseId: id }))}
          />
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
            { value: "due", label: "По сроку" },
            { value: "pending", label: "Больше на проверке" },
            { value: "title", label: "По названию" },
          ]}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState>
          {all.length === 0 ? "Заданий пока нет." : "Под фильтры ничего не подходит."}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((a) => (
            <Link
              key={a.id}
              href={`/assignments/${a.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {a.groupTitle ?? "Без группы"}
                  {a.dueAt ? ` · до ${fmt.format(a.dueAt)}` : ""}
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
