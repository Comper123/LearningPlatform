import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { lessonStatus } from "@/lib/labels";
import { getLesson, listLessonAttendance } from "@/lib/lessons/queries";
import { requireTeacher } from "@/lib/session";

import { AttendanceForm } from "./AttendanceForm";
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

  const [rows, files] = await Promise.all([
    listLessonAttendance(lesson.groupId, lesson.id),
    listLessonFiles(lesson.id),
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
