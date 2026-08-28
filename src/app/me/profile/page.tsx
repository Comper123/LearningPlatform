import Link from "next/link";

import { Avatar } from "@/components/Avatar";
import { Card, PageHeader } from "@/components/ui";
import { listEnrolledCourses } from "@/lib/courses/workspace";
import { getStudentStats } from "@/lib/profile/queries";
import { requireStudent } from "@/lib/session";

import { ProfileForm } from "./ProfileForm";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </Card>
  );
}

export default async function StudentProfilePage() {
  const { user, student } = await requireStudent();

  const [stats, courses] = await Promise.all([
    getStudentStats(student.id),
    listEnrolledCourses(student.id),
  ]);

  return (
    <>
      <PageHeader title="Профиль" description="Ваши данные и прогресс" />

      <Card className="mb-6 flex flex-wrap items-center gap-4 p-5">
        <Avatar name={student.fullName} size={64} />
        <div className="min-w-0">
          <p className="text-lg font-semibold">{student.fullName}</p>
          <p className="mt-0.5 text-xs text-muted">
            {student.email ?? user.email} · ученик
          </p>
          {(student.phone || student.telegram) && (
            <p className="mt-1 text-sm text-muted">
              {[student.phone, student.telegram].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Курсов" value={stats.courses} />
        <Stat
          label="Посещаемость"
          value={
            stats.attendancePercent === null
              ? "—"
              : `${stats.attendancePercent}%`
          }
        />
        <Stat label="Тестов пройдено" value={stats.testsTaken} />
        <Stat label="Работ сдано" value={stats.homeworkSubmitted} />
      </div>

      {courses.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-medium">Мои курсы</h2>
          <Card className="divide-y divide-border">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/me/courses/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:text-accent"
              >
                <span>{c.title}</span>
                <span className="text-xs text-muted">{c.groupTitle}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      <h2 className="mb-3 font-medium">Редактировать</h2>
      <ProfileForm
        fullName={student.fullName}
        phone={student.phone ?? ""}
        telegram={student.telegram ?? ""}
      />
    </>
  );
}
