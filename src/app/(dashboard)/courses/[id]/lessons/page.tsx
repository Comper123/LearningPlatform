import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Badge, Card, EmptyState } from "@/components/ui";
import { listTopics } from "@/lib/courses/queries";
import { listCourseLessons } from "@/lib/courses/teacher-workspace";
import { listCourseGroups } from "@/lib/courses/queries";
import { lessonStatus } from "@/lib/labels";
import { matchesQuery } from "@/lib/list-utils";
import { requireTeacher } from "@/lib/session";

import { LessonForm } from "../../../lessons/LessonForm";

const fmt = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function CourseLessonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; group?: string; status?: string; sort?: string }>;
}) {
  const { id } = await params;
  const { q, group, status, sort } = await searchParams;
  await requireTeacher();

  const [all, groups, topics] = await Promise.all([
    listCourseLessons(id),
    listCourseGroups(id),
    listTopics(id),
  ]);

  const rows = all
    .filter(
      (l) =>
        matchesQuery(q, l.title, l.groupTitle) &&
        (!group || l.groupTitle === group) &&
        (!status || l.status === status),
    )
    .sort((a, b) =>
      sort === "date_asc"
        ? a.startsAt.getTime() - b.startsAt.getTime()
        : b.startsAt.getTime() - a.startsAt.getTime(),
    );

  return (
    <>
      <h2 className="mb-4 font-medium">Занятия курса</h2>

      <div className="mb-5">
        {groups.length === 0 ? (
          <EmptyState>Сначала создайте группу — во вкладке «Группы».</EmptyState>
        ) : (
          <LessonForm
            groups={groups.map((g) => ({ id: g.id, title: g.title, courseId: id }))}
            topics={topics.map((t) => ({ id: t.id, title: t.title, courseId: id }))}
          />
        )}
      </div>

      {all.length > 0 && (
        <ListControls
          search={{ placeholder: "Тема занятия" }}
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
              key: "status",
              label: "Любой статус",
              options: [
                { value: "", label: "Любой статус" },
                ...Object.entries(lessonStatus).map(([value, m]) => ({
                  value,
                  label: m.label,
                })),
              ],
            },
          ]}
          sort={[
            { value: "date_desc", label: "Сначала недавние" },
            { value: "date_asc", label: "Сначала ранние" },
          ]}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState>
          {all.length === 0 ? "Занятий пока нет." : "Под фильтры ничего не подходит."}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((l) => (
            <Link
              key={l.id}
              href={`/lessons/${l.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {l.groupTitle}
                  {l.topicTitle ? ` · ${l.topicTitle}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted">{fmt.format(l.startsAt)}</span>
                <Badge {...lessonStatus[l.status]} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
