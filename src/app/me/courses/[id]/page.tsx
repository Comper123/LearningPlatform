import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getStudentCourseWorkspace } from "@/lib/courses/workspace";
import { requireStudent } from "@/lib/session";
import { signedUrl, storageEnabled } from "@/lib/storage";

import { Workspace, type WorkspaceData } from "./Workspace";

export default async function CourseWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { student } = await requireStudent();

  const ws = await getStudentCourseWorkspace(student.id, id);
  if (!ws) notFound();

  // Подписываем ссылки на файлы занятий на сервере (бакет закрытый).
  const lessons = await Promise.all(
    ws.lessons.map(async (l) => ({
      id: l.id,
      title: l.title,
      startsAt: l.startsAt.toISOString(),
      durationMin: l.durationMin,
      status: l.status,
      summary: l.summary,
      content: l.content,
      topicTitle: l.topicTitle,
      attendanceStatus: l.attendanceStatus,
      files: await Promise.all(
        l.files.map(async (f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          url: await signedUrl(f.path),
        })),
      ),
    })),
  );

  const data: WorkspaceData = {
    lessons,
    assignments: ws.assignments.map((a) => ({
      ...a,
      dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    })),
    tests: ws.tests.map((t) => ({
      id: t.id,
      title: t.title,
      timeLimitMin: t.timeLimitMin,
      closesAt: t.closesAt ? t.closesAt.toISOString() : null,
      state: t.state,
      attempt: t.attempt
        ? { score: t.attempt.score, maxScore: t.attempt.maxScore }
        : null,
    })),
    program: ws.program.map((p) => ({
      topicId: p.topicId,
      title: p.title,
      level: p.level,
    })),
    storageEnabled,
  };

  return (
    <>
      <Link href="/me" className="text-sm text-muted hover:text-foreground">
        ← Мои курсы
      </Link>

      <div className="mt-3">
        <PageHeader
          title={ws.course.title}
          description={[
            `Группа: ${ws.groups.map((g) => g.title).join(", ")}`,
            `Преподаватель: ${ws.course.teacherName}`,
            ws.attendance.rate !== null
              ? `Посещаемость: ${ws.attendance.rate}%`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      </div>

      <Workspace data={data} />
    </>
  );
}
