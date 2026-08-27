import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { listStudentAssignments } from "@/lib/assignments/queries";
import {
  attendanceStatus,
  studentStatus,
  submissionStatus,
} from "@/lib/labels";
import { listStudentAttendance } from "@/lib/lessons/queries";
import { listStudentProgress } from "@/lib/progress/queries";
import { requireTeacher } from "@/lib/session";
import { getStudent, listStudentGroups } from "@/lib/students/queries";

import { ProgressRow } from "./ProgressRow";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
});

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const student = await getStudent(teacher.id, id);

  if (!student) notFound();

  const [studentGroups, attendance, assignments, progress] = await Promise.all([
    listStudentGroups(student.id),
    listStudentAttendance(student.id),
    listStudentAssignments(student.id),
    listStudentProgress(student.id),
  ]);

  const contacts = [
    ["Email", student.email],
    ["Телефон", student.phone],
    ["Telegram", student.telegram],
    ["Вход в систему", student.userId ? "Аккаунт привязан" : "Ещё не заходил"],
  ] as const;

  return (
    <>
      <Link href="/students" className="text-sm text-muted hover:text-foreground">
        ← Все ученики
      </Link>

      <div className="mt-3">
        <PageHeader
          title={student.fullName}
          action={<Badge {...studentStatus[student.status]} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted">Контакты</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            {contacts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          {student.notes && (
            <p className="mt-4 border-t border-border pt-4 text-sm text-muted">
              {student.notes}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted">Группы</h2>
          {studentGroups.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Не записан ни в одну группу.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 text-sm">
              {studentGroups.map((g) => (
                <li key={g.id}>
                  <Link href={`/groups/${g.id}`} className="hover:text-accent">
                    {g.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-medium">Прогресс по темам</h2>
        {progress.length === 0 ? (
          <EmptyState>
            Прогресс появится, когда ученик попадёт в группу с курсом.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-border">
            {progress.map((row) => (
              <ProgressRow
                key={row.topicId}
                studentId={student.id}
                topicId={row.topicId}
                topicTitle={row.topicTitle}
                courseTitle={row.courseTitle}
                level={row.level}
              />
            ))}
          </Card>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-medium">Посещаемость</h2>
          {attendance.length === 0 ? (
            <EmptyState>Отметок пока нет.</EmptyState>
          ) : (
            <Card className="divide-y divide-border">
              {attendance.slice(0, 15).map((row) => (
                <div
                  key={row.lessonId}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="min-w-0 truncate text-sm">{row.title}</span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted">
                      {dateFormat.format(row.startsAt)}
                    </span>
                    <Badge {...attendanceStatus[row.status]} />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-medium">Домашние задания</h2>
          {assignments.length === 0 ? (
            <EmptyState>Заданий пока нет.</EmptyState>
          ) : (
            <Card className="divide-y divide-border">
              {assignments.slice(0, 15).map((row) => (
                <Link
                  key={row.assignmentId}
                  href={`/assignments/${row.assignmentId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-background"
                >
                  <span className="min-w-0 truncate text-sm">{row.title}</span>
                  <div className="flex shrink-0 items-center gap-3">
                    {row.score !== null && (
                      <span className="text-xs text-muted">
                        {row.score}/{row.maxScore}
                      </span>
                    )}
                    <Badge {...submissionStatus[row.status]} />
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
