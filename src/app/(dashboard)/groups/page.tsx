import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { courseOptions } from "@/lib/courses/queries";
import { listGroups } from "@/lib/groups/queries";
import { groupStatus } from "@/lib/labels";
import { matchesQuery, num, pickSort, text } from "@/lib/list-utils";
import { requireTeacher } from "@/lib/session";

import { GroupForm } from "./GroupForm";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; course?: string; sort?: string }>;
}) {
  const { q, status, course, sort } = await searchParams;
  const teacher = await requireTeacher();
  const [all, courses] = await Promise.all([
    listGroups(teacher.id),
    courseOptions(teacher.id),
  ]);

  const groups = all
    .filter(
      (g) =>
        matchesQuery(q, g.title, g.courseTitle, g.scheduleNote) &&
        (!status || g.status === status) &&
        (!course || g.courseTitle === course),
    )
    .sort(
      pickSort(sort, {
        title: (a, b) => text(a.title, b.title),
        students: (a, b) => num(Number(b.studentCount), Number(a.studentCount)),
        status: (a, b) => text(a.status, b.status),
      }, "title"),
    );

  return (
    <>
      <PageHeader
        title="Группы"
        description={`Показано: ${groups.length} из ${all.length}`}
      />

      <div className="mb-6">
        <GroupForm courses={courses} />
      </div>

      <ListControls
        search={{ placeholder: "Название, курс, расписание" }}
        filters={[
          {
            key: "status",
            label: "Любой статус",
            options: [
              { value: "", label: "Любой статус" },
              ...Object.entries(groupStatus).map(([value, m]) => ({
                value,
                label: m.label,
              })),
            ],
          },
          {
            key: "course",
            label: "Любой курс",
            options: [
              { value: "", label: "Любой курс" },
              ...courses.map((c) => ({ value: c.title, label: c.title })),
            ],
          },
        ]}
        sort={[
          { value: "title", label: "По названию" },
          { value: "students", label: "Больше учеников" },
          { value: "status", label: "По статусу" },
        ]}
      />

      {groups.length === 0 ? (
        <EmptyState>
          {all.length === 0
            ? "Групп пока нет — создайте первую."
            : "Под фильтры ничего не подходит."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="h-full p-5 transition hover:border-accent">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium">{group.title}</h2>
                  <Badge {...groupStatus[group.status]} />
                </div>

                <p className="mt-2 text-sm text-muted">
                  {group.courseTitle ?? "Без курса"}
                </p>
                {group.scheduleNote && (
                  <p className="mt-1 text-xs text-muted">{group.scheduleNote}</p>
                )}
                <p className="mt-4 text-xs text-muted">
                  Учеников: {group.studentCount}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
