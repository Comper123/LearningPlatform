import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import {
  attendanceRate,
  buildMatrix,
  type AttendanceCell,
} from "@/lib/attendance/matrix";
import { listGroupAttendance } from "@/lib/attendance/queries";
import { getGroup, listGroupMembers } from "@/lib/groups/queries";
import { attendanceStatus } from "@/lib/labels";
import { requireTeacher } from "@/lib/session";

const pad = (n: number) => String(n).padStart(2, "0");
const shortDate = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;

export default async function GroupAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const group = await getGroup(teacher.id, id);

  if (!group) notFound();

  const [members, rows] = await Promise.all([
    listGroupMembers(group.id),
    listGroupAttendance(group.id),
  ]);

  const { lessons, marks } = buildMatrix(rows);

  return (
    <>
      <Link
        href={`/groups/${group.id}`}
        className="text-sm text-muted hover:text-foreground"
      >
        ← {group.title}
      </Link>

      <div className="mt-3">
        <PageHeader
          title="Сводка посещаемости"
          description={`${members.length} учеников · ${lessons.length} занятий`}
        />
      </div>

      {lessons.length === 0 || members.length === 0 ? (
        <EmptyState>
          {members.length === 0
            ? "В группе нет учеников."
            : "У группы ещё нет проведённых занятий."}
        </EmptyState>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="sticky left-0 z-10 bg-surface-2 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted uppercase">
                    Ученик
                  </th>

                  {lessons.map((lesson) => (
                    <th
                      key={lesson.id}
                      title={lesson.title}
                      className="px-1 py-3 text-center text-xs font-medium text-muted"
                    >
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className="hover:text-accent"
                      >
                        {shortDate(lesson.startsAt)}
                      </Link>
                    </th>
                  ))}

                  <th className="px-3 py-3 text-right text-xs font-medium tracking-wide text-muted uppercase">
                    Посещение
                  </th>
                </tr>
              </thead>

              <tbody>
                {members.map((member) => {
                  const cells: AttendanceCell[] = lessons.map(
                    (lesson) => marks.get(`${lesson.id}:${member.id}`) ?? null,
                  );
                  const rate = attendanceRate(cells);

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="sticky left-0 z-10 bg-surface px-4 py-2 whitespace-nowrap">
                        <Link
                          href={`/students/${member.id}`}
                          className="font-medium hover:text-accent"
                        >
                          {member.fullName}
                        </Link>
                      </td>

                      {cells.map((cell, index) => (
                        <td key={lessons[index].id} className="px-1 py-2">
                          {cell ? (
                            <span
                              title={attendanceStatus[cell].label}
                              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold ${attendanceStatus[cell].style}`}
                            >
                              {attendanceStatus[cell].short}
                            </span>
                          ) : (
                            <span className="mx-auto block h-7 w-7 text-center leading-7 text-muted/40">
                              ·
                            </span>
                          )}
                        </td>
                      ))}

                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {rate.percent === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <>
                            <span
                              className={`font-semibold tabular-nums ${
                                rate.percent >= 80
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : rate.percent >= 50
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-danger"
                              }`}
                            >
                              {rate.percent}%
                            </span>
                            <span className="ml-2 text-xs text-muted">
                              {rate.attended}/{rate.counted}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            {Object.values(attendanceStatus).map((meta) => (
              <span key={meta.short} className="flex items-center gap-1.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded font-semibold ${meta.style}`}
                >
                  {meta.short}
                </span>
                {meta.label}
              </span>
            ))}
            <span>· точка — отметки нет</span>
          </div>

          <p className="mt-3 text-xs text-muted">
            Опоздание засчитывается как посещение. Уважительная причина не
            учитывается в проценте — она не улучшает и не ухудшает показатель.
            Отменённые занятия в сводку не входят.
          </p>
        </>
      )}
    </>
  );
}
