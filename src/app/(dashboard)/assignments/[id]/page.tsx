import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getAssignment, listSubmissions } from "@/lib/assignments/queries";
import { requireTeacher } from "@/lib/session";
import { signedUrl } from "@/lib/storage";

import { ReviewRow } from "./ReviewRow";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const assignment = await getAssignment(teacher.id, id);

  if (!assignment) notFound();

  const submitted = await listSubmissions(assignment.id);

  // Ссылки на вложения подписываем на сервере: бакет закрытый.
  const rows = await Promise.all(
    submitted.map(async (row) => ({
      ...row,
      fileUrl: row.filePath ? await signedUrl(row.filePath) : null,
    })),
  );

  return (
    <>
      <Link
        href="/assignments"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Все задания
      </Link>

      <div className="mt-3">
        <PageHeader
          title={assignment.title}
          description={[
            assignment.groupTitle,
            assignment.topicTitle,
            assignment.dueAt && `до ${dateFormat.format(assignment.dueAt)}`,
            `макс. ${assignment.maxScore} баллов`,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      </div>

      {assignment.description && (
        <Card className="mb-6 p-5 text-sm whitespace-pre-line">
          {assignment.description}
        </Card>
      )}

      <h2 className="mb-3 font-medium">Работы ({rows.length})</h2>

      {rows.length === 0 ? (
        <EmptyState>Задание никому не выдано.</EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((row) => (
            <ReviewRow
              key={row.studentId}
              assignmentId={assignment.id}
              row={row}
              maxScore={assignment.maxScore}
            />
          ))}
        </Card>
      )}
    </>
  );
}
