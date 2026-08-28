import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireStudent } from "@/lib/session";
import { finalizeAttempt } from "@/lib/tests/grading";
import { attemptState, withinWindow } from "@/lib/tests/logic";
import {
  getAttempt,
  getAttemptReview,
  getStudentTest,
  listAnswers,
  listQuestionsForTaking,
} from "@/lib/tests/student";
import { startAttempt, submitAttempt } from "@/lib/tests/student-actions";

import { AnswerCard } from "./AnswerCard";
import { TestTimer } from "./TestTimer";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function TakeTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { student } = await requireStudent();
  const test = await getStudentTest(student.id, id);

  if (!test) notFound();

  let attempt = await getAttempt(student.id, id);
  let state = attemptState(attempt);

  // Время вышло, а попытка открыта — досдаём и показываем результат.
  if (attempt && state === "expired") {
    await finalizeAttempt(attempt.id, true);
    attempt = await getAttempt(student.id, id);
    state = attemptState(attempt);
  }

  const back = (
    <Link href="/me/tests" className="text-sm text-muted hover:text-foreground">
      ← Все тесты
    </Link>
  );

  /* ---------------------------------------------------- не начат */

  if (state === "not_started") {
    const open = withinWindow(test);

    return (
      <>
        {back}
        <div className="mt-3">
          <PageHeader title={test.title} description={test.description ?? undefined} />
        </div>

        <Card className="max-w-lg p-6">
          <ul className="grid gap-2 text-sm">
            <li>
              <span className="text-muted">Лимит времени:</span>{" "}
              {test.timeLimitMin ? `${test.timeLimitMin} минут` : "без ограничения"}
            </li>
            {test.closesAt && (
              <li>
                <span className="text-muted">Доступен до:</span>{" "}
                {dateFormat.format(test.closesAt)}
              </li>
            )}
          </ul>

          <p className="mt-4 text-sm text-muted">
            После старта отсчёт времени не останавливается, но к тесту можно
            вернуться, пока оно не вышло — ответы сохраняются автоматически.
          </p>

          {open ? (
            <form action={startAttempt} className="mt-5">
              <input type="hidden" name="testId" value={test.id} />
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:brightness-110"
              >
                Начать тест
              </button>
            </form>
          ) : (
            <p className="mt-5 text-sm text-danger">
              {test.opensAt && new Date() < test.opensAt
                ? `Откроется ${dateFormat.format(test.opensAt)}`
                : "Тест закрыт"}
            </p>
          )}
        </Card>
      </>
    );
  }

  /* ------------------------------------------------ проходится */

  if (state === "in_progress" && attempt) {
    const [questions, answers] = await Promise.all([
      listQuestionsForTaking(test.id),
      listAnswers(attempt.id),
    ]);

    const answerMap = new Map(answers.map((a) => [a.questionId, a]));

    return (
      <>
        {back}
        <div className="mt-3">
          <PageHeader title={test.title} />
        </div>

        {attempt.expiresAt && (
          <div className="mb-5">
            <TestTimer
              testId={test.id}
              expiresAtIso={attempt.expiresAt.toISOString()}
            />
          </div>
        )}

        <div className="grid max-w-2xl gap-3">
          {questions.map((q, i) => {
            const saved = answerMap.get(q.id);
            return (
              <AnswerCard
                key={q.id}
                testId={test.id}
                index={i + 1}
                question={q}
                savedOptionIds={saved?.optionIds ?? []}
                savedText={saved?.text ?? null}
              />
            );
          })}

          <form action={submitAttempt} className="mt-2">
            <input type="hidden" name="testId" value={test.id} />
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:brightness-110"
            >
              Завершить и сдать
            </button>
          </form>
        </div>
      </>
    );
  }

  /* -------------------------------------------------- результат */

  if (attempt && attempt.submittedAt) {
    const review = await getAttemptReview(
      test.id,
      attempt.id,
      test.revealAnswers,
    );
    const pending = attempt.score === null;

    return (
      <>
        {back}
        <div className="mt-3">
          <PageHeader
            title={test.title}
            description={
              attempt.autoSubmitted ? "Сдан автоматически по истечении времени" : "Сдан"
            }
            action={
              <Badge
                label={
                  pending
                    ? `${attempt.autoScore}/${attempt.maxScore} · на проверке`
                    : `${attempt.score}/${attempt.maxScore}`
                }
                style={
                  pending
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }
              />
            }
          />
        </div>

        {!test.revealAnswers ? (
          <EmptyState>
            Преподаватель скрыл разбор ответов для этого теста.
          </EmptyState>
        ) : (
          <div className="grid max-w-2xl gap-3">
            {review.map(({ question, options, answer }, i) => (
              <Card key={question.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">
                    {i + 1}. {question.prompt}
                  </p>
                  <span className="shrink-0 text-xs text-muted">
                    {answer?.awardedPoints ?? 0}/{question.points}
                  </span>
                </div>

                {question.type === "text" ? (
                  <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm whitespace-pre-wrap">
                    {answer?.text?.trim() || (
                      <span className="text-muted">Ответ не дан</span>
                    )}
                  </div>
                ) : (
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {options.map((o) => (
                      <li
                        key={o.id}
                        className={`rounded-lg border px-3 py-2 ${
                          o.isCorrect
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : o.chosen
                              ? "border-danger/40 bg-danger/10"
                              : "border-border"
                        }`}
                      >
                        {o.chosen ? "◉ " : "○ "}
                        {o.text}
                        {o.isCorrect && (
                          <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                            верный
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </>
    );
  }

  notFound();
}
