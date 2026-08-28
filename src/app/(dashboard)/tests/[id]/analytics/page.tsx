import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireTeacher } from "@/lib/session";
import { getTestAnalytics } from "@/lib/tests/queries";
import { QUESTION_TYPES } from "@/lib/tests/question-meta";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

export default async function TestAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const data = await getTestAnalytics(teacher.id, id);

  if (!data) notFound();

  const { test, totals, questions } = data;

  return (
    <>
      <Link
        href={`/tests/${test.id}`}
        className="text-sm text-muted hover:text-foreground"
      >
        ← {test.title}
      </Link>

      <div className="mt-3">
        <PageHeader title="Аналитика теста" />
      </div>

      {totals.attempts === 0 ? (
        <EmptyState>Тест ещё никто не проходил.</EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Попыток" value={totals.attempts} />
            <Stat label="Завершено" value={totals.finished} />
            <Stat label="В процессе" value={totals.inProgress} />
            <Stat
              label="Средний результат"
              value={totals.avgPercent === null ? "—" : `${totals.avgPercent}%`}
            />
            <Stat
              label="Среднее время"
              value={totals.avgMinutes === null ? "—" : `${totals.avgMinutes} мин`}
            />
            <Stat label="Сдано по таймеру" value={totals.autoSubmitted} />
            <Stat label="Ждут проверки" value={totals.pendingReview} />
            <Stat label="Макс. балл" value={totals.maxScore} />
          </div>

          <h2 className="mt-8 mb-3 font-medium">Разбор по вопросам</h2>
          <Card className="divide-y divide-border">
            {questions.map((q, i) => {
              const rate = q.correctRate;
              const barColor =
                rate === null
                  ? "bg-zinc-400"
                  : rate >= 70
                    ? "bg-emerald-500"
                    : rate >= 40
                      ? "bg-amber-500"
                      : "bg-red-500";

              return (
                <div key={q.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">
                      {i + 1}. {q.prompt}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${QUESTION_TYPES[q.type].style}`}
                    >
                      {QUESTION_TYPES[q.type].short}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full ${barColor}`}
                        style={{ width: `${rate ?? 0}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-xs text-muted tabular-nums">
                      {q.type === "text"
                        ? `${q.answered} ответили`
                        : rate === null
                          ? "нет ответов"
                          : `${rate}% верно (${q.correct}/${q.answered})`}
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </>
  );
}
