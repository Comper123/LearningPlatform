import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { listStudentAssignments } from "@/lib/assignments/queries";
import { submissionStatus } from "@/lib/labels";
import { requireStudent } from "@/lib/session";
import { storageEnabled } from "@/lib/storage";

import { SubmitForm } from "./SubmitForm";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function StudentHomeworkPage() {
  const { student } = await requireStudent();
  const assignments = await listStudentAssignments(student.id);

  return (
    <>
      <PageHeader
        title="Домашние задания"
        description="Сдайте работу ссылкой и смотрите оценку с комментарием"
      />

      {assignments.length === 0 ? (
        <EmptyState>Заданий пока нет.</EmptyState>
      ) : (
        <div className="grid gap-4">
          {assignments.map((a) => (
            <Card key={a.assignmentId} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">{a.title}</h2>
                  {a.dueAt && (
                    <p className="mt-1 text-xs text-muted">
                      Срок: {dateFormat.format(a.dueAt)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {a.score !== null && (
                    <span className="text-sm font-medium">
                      {a.score} / {a.maxScore}
                    </span>
                  )}
                  <Badge {...submissionStatus[a.status]} />
                </div>
              </div>

              {a.feedback && (
                <p className="mt-3 rounded-lg bg-background p-3 text-sm text-muted">
                  {a.feedback}
                </p>
              )}

              {/* Проверенную работу пересдать нельзя, доработку — можно. */}
              {a.status !== "reviewed" && (
                <SubmitForm
                  assignmentId={a.assignmentId}
                  url={a.url}
                  codeText={a.codeText}
                  codeLang={a.codeLang}
                  fileName={a.fileName}
                  storageEnabled={storageEnabled}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
