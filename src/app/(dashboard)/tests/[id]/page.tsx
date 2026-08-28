import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireTeacher } from "@/lib/session";
import { deleteTest, toggleTestStatus } from "@/lib/tests/actions";
import {
  countTestAttempts,
  getTest,
  listQuestions,
  listTestGroupIds,
  testGroupOptions,
} from "@/lib/tests/queries";

import { GroupPicker } from "./GroupPicker";
import { QuestionCard } from "./QuestionCard";
import { QuestionForm } from "./QuestionForm";
import { TestSettings } from "./TestSettings";

export default async function TestEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const test = await getTest(teacher.id, id);

  if (!test) notFound();

  const [questions, groups, selectedGroups, attemptCount] = await Promise.all([
    listQuestions(test.id),
    testGroupOptions(teacher.id),
    listTestGroupIds(test.id),
    countTestAttempts(test.id),
  ]);

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const published = test.status === "published";
  const locked = attemptCount > 0;

  return (
    <>
      <Link href="/tests" className="text-sm text-muted hover:text-foreground">
        ← Все тесты
      </Link>

      <div className="mt-3">
        <PageHeader
          title={test.title}
          description={`${questions.length} вопр. · ${totalPoints} баллов${
            test.timeLimitMin ? ` · ${test.timeLimitMin} мин` : " · без лимита"
          }`}
          action={
            <div className="flex items-center gap-2">
              <Badge
                label={published ? "Опубликован" : "Черновик"}
                style={
                  published
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-zinc-500/10 text-muted"
                }
              />
              <form action={toggleTestStatus}>
                <input type="hidden" name="testId" value={test.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-surface-2"
                >
                  {published ? "Снять с публикации" : "Опубликовать"}
                </button>
              </form>
            </div>
          }
        />
      </div>

      {!published && questions.length === 0 && (
        <p className="mb-4 text-sm text-muted">
          Добавьте хотя бы один вопрос, чтобы опубликовать тест.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-medium">Вопросы</h2>
              <Link
                href={`/tests/${test.id}/analytics`}
                className="text-sm text-muted hover:text-accent"
              >
                Аналитика →
              </Link>
            </div>

            {locked && (
              <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
                Тест уже проходили ({attemptCount}) — вопросы заблокированы,
                чтобы не сбить результаты.
              </p>
            )}

            {questions.length === 0 ? (
              <EmptyState>Пока нет вопросов.</EmptyState>
            ) : (
              <ol className="grid gap-2">
                {questions.map((q, index) => (
                  <li key={q.id}>
                    <QuestionCard
                      testId={test.id}
                      index={index + 1}
                      question={q}
                      locked={locked}
                    />
                  </li>
                ))}
              </ol>
            )}

            {!locked && (
              <div className="mt-4">
                <QuestionForm testId={test.id} />
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-medium">Настройки</h2>
            <TestSettings test={test} />
          </section>
        </div>

        <div className="grid gap-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Кому назначен</h2>
              <Link
                href={`/tests/${test.id}/results`}
                className="text-sm text-muted hover:text-accent"
              >
                Результаты →
              </Link>
            </div>
            <GroupPicker
              testId={test.id}
              groups={groups}
              selected={selectedGroups}
            />
          </section>

          <section>
            <h2 className="mb-3 font-medium">Опасная зона</h2>
            <Card className="p-4">
              <form action={deleteTest}>
                <input type="hidden" name="testId" value={test.id} />
                <button
                  type="submit"
                  className="text-sm text-danger transition hover:underline"
                >
                  Удалить тест со всеми попытками
                </button>
              </form>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
