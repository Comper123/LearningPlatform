import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { attendanceStatus, lessonStatus } from "@/lib/labels";
import {
  getLesson,
  getLessonAnalytics,
  listLessonAttendance,
  listLessonFiles,
} from "@/lib/lessons/queries";
import { requireTeacher } from "@/lib/session";
import { signedUrl, storageEnabled } from "@/lib/storage";

import { AttendanceForm } from "./AttendanceForm";
import { LessonFiles } from "./LessonFiles";
import { LessonMeta } from "./LessonMeta";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const lesson = await getLesson(teacher.id, id);

  if (!lesson) notFound();

  const [rows, files, analytics] = await Promise.all([
    listLessonAttendance(lesson.groupId, lesson.id),
    listLessonFiles(lesson.id),
    getLessonAnalytics(lesson.groupId, lesson.id),
  ]);

  // Бакет закрытый, поэтому ссылки подписываем на сервере.
  const materials = await Promise.all(
    files.map(async (file) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      url: await signedUrl(file.path),
    })),
  );

  return (
    <>
      <Link href="/lessons" className="text-sm text-muted hover:text-foreground">
        ← Все занятия
      </Link>

      <div className="mt-3">
        <PageHeader
          title={lesson.title}
          description={[
            dateFormat.format(lesson.startsAt),
            `${lesson.durationMin} мин`,
            lesson.topicTitle,
          ]
            .filter(Boolean)
            .join(" · ")}
          action={<Badge {...lessonStatus[lesson.status]} />}
        />
      </div>

      <p className="mb-6 text-sm text-muted">
        Группа:{" "}
        <Link href={`/groups/${lesson.groupId}`} className="hover:text-accent">
          {lesson.groupTitle}
        </Link>
      </p>

      <LessonMeta
        lessonId={lesson.id}
        status={lesson.status}
        summary={lesson.summary}
        content={lesson.content}
      />

      <section className="mt-8">
        <h2 className="mb-4 font-medium">Материалы урока</h2>
        <LessonFiles
          lessonId={lesson.id}
          files={materials}
          storageEnabled={storageEnabled}
        />
      </section>

      {analytics.marked > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-medium">Аналитика занятия</h2>
          <Card className="p-5">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <p className="text-sm">
                <span className="text-muted">Явка: </span>
                <span className="text-lg font-semibold tabular-nums">
                  {analytics.attendanceRate}%
                </span>
              </p>
              <p className="text-sm text-muted">
                Отмечено {analytics.marked} из {analytics.rosterSize}
              </p>
            </div>

            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2">
              {(["present", "late", "excused", "absent"] as const).map((key) =>
                analytics.counts[key] > 0 ? (
                  <div
                    key={key}
                    title={`${attendanceStatus[key].label}: ${analytics.counts[key]}`}
                    className={
                      key === "present"
                        ? "bg-emerald-500"
                        : key === "late"
                          ? "bg-amber-500"
                          : key === "excused"
                            ? "bg-sky-500"
                            : "bg-red-500"
                    }
                    style={{
                      width: `${(analytics.counts[key] / analytics.marked) * 100}%`,
                    }}
                  />
                ) : null,
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {(["present", "late", "excused", "absent"] as const).map((key) => (
                <span key={key}>
                  {attendanceStatus[key].label}: {analytics.counts[key]}
                </span>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 font-medium">Посещаемость</h2>
        {rows.length === 0 ? (
          <EmptyState>
            В группе нет учеников — сначала запишите их в{" "}
            <Link href={`/groups/${lesson.groupId}`} className="text-accent">
              состав группы
            </Link>
            .
          </EmptyState>
        ) : (
          <AttendanceForm lessonId={lesson.id} rows={rows} />
        )}
      </section>
    </>
  );
}
