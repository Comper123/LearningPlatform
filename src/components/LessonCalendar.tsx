import Link from "next/link";

import { Card } from "@/components/ui";
import { WEEKDAYS_SHORT } from "@/lib/schedule/constants";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const statusDot = {
  planned: "bg-sky-500",
  done: "bg-emerald-500",
  cancelled: "bg-zinc-400",
} as const;

type Lesson = {
  id: string;
  title: string;
  startsAt: Date;
  status: keyof typeof statusDot;
  groupTitle: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** Месяц в виде "2026-08" для ссылок перелистывания. */
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function LessonCalendar({
  month,
  lessons,
}: {
  month: Date;
  lessons: Lesson[];
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - mondayIndex(first));

  const days = Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });

  // Занятия раскладываем по дням заранее — иначе на каждую клетку пришлось бы
  // фильтровать весь список.
  const byDay = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const key = dateKey(lesson.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), lesson]);
  }

  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const todayKey = dateKey(new Date());

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link
          href={`/lessons?month=${monthKey(prev)}`}
          className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          ‹ {MONTHS[prev.getMonth()]}
        </Link>

        <h2 className="font-medium">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </h2>

        <Link
          href={`/lessons?month=${monthKey(next)}`}
          className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          {MONTHS[next.getMonth()]} ›
        </Link>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-surface-2">
        {WEEKDAYS_SHORT.map((weekday) => (
          <div
            key={weekday}
            className="px-2 py-2 text-center text-xs font-medium text-muted"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const dayLessons = byDay.get(key) ?? [];
          const outside = day.getMonth() !== month.getMonth();

          return (
            <div
              key={key}
              className={`min-h-24 border-r border-b border-border p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                outside ? "bg-surface-2/40" : ""
              }`}
            >
              <div
                className={`mb-1 px-1 text-xs ${
                  key === todayKey
                    ? "font-semibold text-accent"
                    : outside
                      ? "text-muted/50"
                      : "text-muted"
                }`}
              >
                {day.getDate()}
              </div>

              <div className="flex flex-col gap-1">
                {dayLessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/lessons/${lesson.id}`}
                    title={`${lesson.title} · ${lesson.groupTitle}`}
                    className="flex items-center gap-1.5 rounded-md bg-surface-2 px-1.5 py-1 text-xs transition hover:bg-accent-soft"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[lesson.status]}`}
                    />
                    <span className="shrink-0 tabular-nums text-muted">
                      {pad(lesson.startsAt.getHours())}:
                      {pad(lesson.startsAt.getMinutes())}
                    </span>
                    <span className="truncate">{lesson.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
