import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmitButton } from "@/components/form-ui";
import { Card, PageHeader } from "@/components/ui";
import { requireTeacher } from "@/lib/session";
import { gradeTextAnswer } from "@/lib/tests/actions";
import { getAttemptForReview } from "@/lib/tests/queries";

export default async function AttemptReviewPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const teacher = await requireTeacher();
  const data = await getAttemptForReview(teacher.id, attemptId);

  if (!data || data.attempt.testId !== id) notFound();

  const { attempt, items } = data;

  return (
    <>
      <Link
        href={`/tests/${id}/results`}
        className="text-sm text-muted hover:text-foreground"
      >
        ← Результаты
      </Link>

      <div className="mt-3">
        <PageHeader
          title={`Проверка — ${attempt.studentName}`}
          description={`Автопроверка: ${attempt.autoScore}/${attempt.maxScore} баллов`}
        />
      </div>

      <div className="grid gap-4">
        {items.map(({ question, answer }) => (
          <Card key={question.id} className="p-5">
            <p className="text-sm font-medium">{question.prompt}</p>
            <p className="mt-1 text-xs text-muted">
              Максимум за вопрос: {question.points}
            </p>

            <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm whitespace-pre-wrap">
              {answer?.text?.trim() || (
                <span className="text-muted">Ответ не дан</span>
              )}
            </div>

            <form
              action={gradeTextAnswer}
              className="mt-3 flex items-end gap-2"
            >
              <input type="hidden" name="testId" value={id} />
              <input type="hidden" name="attemptId" value={attemptId} />
              <input type="hidden" name="questionId" value={question.id} />

              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted">Балл</span>
                <input
                  name="points"
                  type="number"
                  min={0}
                  max={question.points}
                  defaultValue={answer?.awardedPoints ?? 0}
                  className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </label>

              <SubmitButton>Поставить</SubmitButton>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
