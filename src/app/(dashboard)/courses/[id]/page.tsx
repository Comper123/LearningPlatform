import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui";
import { getCourseOverview } from "@/lib/courses/teacher-workspace";
import { requireTeacher } from "@/lib/session";

function Tile({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <Card
        className={`h-full p-4 transition group-hover:border-accent ${
          accent && value > 0 ? "border-accent bg-accent-soft" : ""
        }`}
      >
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </Card>
    </Link>
  );
}

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const data = await getCourseOverview(teacher.id, id);
  if (!data) notFound();

  const { course, stats } = data;
  const base = `/courses/${id}`;

  return (
    <>
      <h2 className="mb-1 font-medium">Обзор</h2>
      {(course.level || course.description) && (
        <p className="mb-5 text-sm text-muted">
          {[course.level, course.description].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Tile label="Тем в программе" value={stats.topics} href={`${base}/program`} />
        <Tile label="Групп" value={stats.groups} href={`${base}/groups`} />
        <Tile label="Учеников" value={stats.students} href={`${base}/students`} />
        <Tile label="Занятий" value={stats.lessons} href={`${base}/lessons`} />
        <Tile label="Впереди занятий" value={stats.upcoming} href={`${base}/lessons`} />
        <Tile
          label="Работ на проверке"
          value={stats.hwPending}
          href={`${base}/homework`}
          accent
        />
        <Tile label="Тестов" value={stats.tests} href={`${base}/tests`} />
        <Tile
          label="Заявок на курс"
          value={stats.openRequests}
          href={`${base}/students`}
          accent
        />
      </div>

      {course.isPublic && course.slug && (
        <Card className="mt-5 flex flex-wrap items-center gap-3 p-4 text-sm">
          <span className="text-muted">Курс опубликован:</span>
          <a
            href={`/c/${course.slug}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent hover:underline"
          >
            /c/{course.slug} →
          </a>
        </Card>
      )}
    </>
  );
}
