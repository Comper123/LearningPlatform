import Link from "next/link";

import { LessonCalendar, monthKey } from "@/components/LessonCalendar";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { allTopics } from "@/lib/courses/queries";
import { groupOptions } from "@/lib/groups/queries";
import { lessonStatus } from "@/lib/labels";
import { listLessons } from "@/lib/lessons/queries";
import { listLessonsBetween } from "@/lib/schedule/queries";
import { requireTeacher } from "@/lib/session";

import { LessonForm } from "./LessonForm";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "2026-08" из адреса; мусор игнорируем и показываем текущий месяц. */
function parseMonth(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const { month: monthParam, view } = await searchParams;
  const teacher = await requireTeacher();

  const month = parseMonth(monthParam);
  const isList = view === "list";

  const monthStart = month;
  const monthEnd = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
    23,
    59,
    59,
  );
  // Календарь показывает и хвосты соседних месяцев, поэтому берём с запасом.
  const from = new Date(monthStart);
  from.setDate(from.getDate() - 7);
  const to = new Date(monthEnd);
  to.setDate(to.getDate() + 7);

  const [groups, topics, calendarLessons, allLessons] = await Promise.all([
    groupOptions(teacher.id),
    allTopics(teacher.id),
    isList ? Promise.resolve([]) : listLessonsBetween(teacher.id, from, to),
    isList ? listLessons(teacher.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Занятия"
        description="Расписание и посещаемость"
        action={
          <div className="flex rounded-lg border border-border p-0.5">
            <ViewTab
              href={`/lessons?month=${monthKey(month)}`}
              label="Календарь"
              active={!isList}
            />
            <ViewTab href="/lessons?view=list" label="Список" active={isList} />
          </div>
        }
      />

      <div className="mb-6">
        {groups.length === 0 ? (
          <EmptyState>
            Сначала создайте{" "}
            <Link href="/groups" className="text-accent">
              группу
            </Link>{" "}
            — занятия ставятся для неё.
          </EmptyState>
        ) : (
          <LessonForm groups={groups} topics={topics} />
        )}
      </div>

      {isList ? (
        <ListView lessons={allLessons} />
      ) : (
        <LessonCalendar month={month} lessons={calendarLessons} />
      )}
    </>
  );
}

function ViewTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        active
          ? "bg-accent-soft font-medium text-accent"
          : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

type LessonRow = Awaited<ReturnType<typeof listLessons>>[number];

function ListView({ lessons }: { lessons: LessonRow[] }) {
  const now = Date.now();
  const upcoming = lessons.filter((l) => l.startsAt.getTime() >= now).reverse();
  const past = lessons.filter((l) => l.startsAt.getTime() < now);

  return (
    <>
      <LessonList title="Впереди" lessons={upcoming} />
      <div className="mt-8">
        <LessonList title="Прошедшие" lessons={past} />
      </div>
    </>
  );
}

function LessonList({ title, lessons }: { title: string; lessons: LessonRow[] }) {
  return (
    <section>
      <h2 className="mb-3 font-medium">{title}</h2>

      {lessons.length === 0 ? (
        <EmptyState>Пусто.</EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/lessons/${lesson.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{lesson.title}</p>
                <p className="mt-0.5 text-xs text-muted">{lesson.groupTitle}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted">
                  {dateFormat.format(lesson.startsAt)}
                </span>
                <Badge {...lessonStatus[lesson.status]} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
