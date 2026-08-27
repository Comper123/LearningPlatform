import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { attendanceStatus } from "@/lib/labels";
import { listStudentAttendance } from "@/lib/lessons/queries";
import { requireStudent } from "@/lib/session";
import { listStudentGroups } from "@/lib/students/queries";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
});

export default async function StudentHomePage() {
  const { student } = await requireStudent();

  const [groups, attendance] = await Promise.all([
    listStudentGroups(student.id),
    listStudentAttendance(student.id),
  ]);

  const attended = attendance.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;

  return (
    <>
      <PageHeader
        title="Мой кабинет"
        description="Занятия, посещаемость и прогресс"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Групп</p>
          <p className="mt-2 text-3xl font-semibold">{groups.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Занятий отмечено</p>
          <p className="mt-2 text-3xl font-semibold">{attendance.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Из них посещено</p>
          <p className="mt-2 text-3xl font-semibold">{attended}</p>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-medium">Мои группы</h2>
        {groups.length === 0 ? (
          <EmptyState>
            Преподаватель ещё не записал вас в группу.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-border">
            {groups.map((group) => (
              <p key={group.id} className="px-4 py-3 text-sm">
                {group.title}
              </p>
            ))}
          </Card>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-medium">История занятий</h2>
        {attendance.length === 0 ? (
          <EmptyState>Отметок о посещении пока нет.</EmptyState>
        ) : (
          <Card className="divide-y divide-border">
            {attendance.map((row) => (
              <div
                key={row.lessonId}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{row.groupTitle}</p>
                </div>

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
    </>
  );
}
