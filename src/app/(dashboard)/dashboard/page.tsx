import { and, count, eq, gte } from "drizzle-orm";
import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { assignments, groups, lessons, students, submissions } from "@/db/schema";
import { requireTeacher } from "@/lib/session";

export default async function DashboardPage() {
  const teacher = await requireTeacher();

  const [
    [activeStudents],
    [activeGroups],
    [upcomingLessons],
    [pendingWork],
    [openRequests],
  ] = await Promise.all([
      db
        .select({ value: count() })
        .from(students)
        .where(
          and(eq(students.teacherId, teacher.id), eq(students.status, "active")),
        ),
      db
        .select({ value: count() })
        .from(groups)
        .where(
          and(eq(groups.teacherId, teacher.id), eq(groups.status, "active")),
        ),
      db
        .select({ value: count() })
        .from(lessons)
        .innerJoin(groups, eq(groups.id, lessons.groupId))
        .where(
          and(
            eq(groups.teacherId, teacher.id),
            eq(lessons.status, "planned"),
            gte(lessons.startsAt, new Date()),
          ),
        ),
      db
        .select({ value: count() })
        .from(submissions)
        .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
        .where(
          and(
            eq(assignments.teacherId, teacher.id),
            eq(submissions.status, "submitted"),
          ),
        ),
      db
        .select({ value: count() })
        .from(students)
        .where(
          and(
            eq(students.teacherId, teacher.id),
            eq(students.status, "pending"),
          ),
        ),
    ]);

  const stats = [
    { label: "Учеников занимается", value: activeStudents.value, href: "/students" },
    { label: "Активных групп", value: activeGroups.value, href: "/groups" },
    { label: "Занятий впереди", value: upcomingLessons.value, href: "/lessons" },
    { label: "Работ на проверке", value: pendingWork.value, href: "/assignments" },
  ];

  // Заявки показываем отдельной строкой — их нельзя пропустить.
  const hasRequests = openRequests.value > 0;

  return (
    <>
      <PageHeader
        title={`Привет, ${teacher.name?.split(" ")[0] ?? "преподаватель"}`}
        description="Сводка по вашему учебному процессу"
      />

      {hasRequests && (
        <Link href="/students" className="mb-5 block">
          <Card className="flex items-center gap-3 border-accent bg-accent-soft p-4 text-sm transition hover:brightness-95">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-xs font-semibold text-accent-fg">
              {openRequests.value}
            </span>
            новых заявок на зачисление — примите или отклоните на странице
            «Ученики».
          </Card>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full p-5 transition group-hover:border-accent group-hover:shadow-pop">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                {stat.value}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
