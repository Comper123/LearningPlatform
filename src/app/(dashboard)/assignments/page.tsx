import Link from "next/link";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { listAssignments } from "@/lib/assignments/queries";
import { allTopics } from "@/lib/courses/queries";
import { groupOptions } from "@/lib/groups/queries";
import { requireTeacher } from "@/lib/session";

import { AssignmentForm } from "./AssignmentForm";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AssignmentsPage() {
  const teacher = await requireTeacher();
  const [assignments, groups, topics] = await Promise.all([
    listAssignments(teacher.id),
    groupOptions(teacher.id),
    allTopics(teacher.id),
  ]);

  return (
    <>
      <PageHeader
        title="Домашние задания"
        description="Выдача, сдачи и проверка"
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

      {assignments.length === 0 ? (
        <EmptyState>Заданий пока нет.</EmptyState>
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
