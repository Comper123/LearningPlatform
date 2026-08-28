import Link from "next/link";
import { notFound } from "next/navigation";

import { ListControls } from "@/components/ListControls";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { matchesQuery, pickSort, text } from "@/lib/list-utils";
import { requireTeacher } from "@/lib/session";
import { attemptState } from "@/lib/tests/logic";
import { getTest, listTestResults } from "@/lib/tests/queries";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function TestResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; state?: string; sort?: string }>;
}) {
  const { id } = await params;
  const { q, state, sort } = await searchParams;
  const teacher = await requireTeacher();
  const test = await getTest(teacher.id, id);

  if (!test) notFound();

  const raw = await listTestResults(test.id);

  const withState = raw.map((a) => ({
    ...a,
    _state: attemptState({
      startedAt: a.startedAt,
      expiresAt: a.expiresAt,
      submittedAt: a.submittedAt,
    }),
  }));

  const attempts = withState
    .filter(
      (a) =>
        matchesQuery(q, a.fullName) &&
        (!state ||
          (state === "review"
            ? a.submittedAt && a.score === null
            : a._state === state)),
    )
    .sort(
      pickSort(sort, {
        recent: (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
        name: (a, b) => text(a.fullName, b.fullName),
        score: (a, b) =>
          (b.score ?? b.autoScore ?? -1) - (a.score ?? a.autoScore ?? -1),
      }, "recent"),
    );

  return (
    <>
      <Link
        href={`/tests/${test.id}`}
        className="text-sm text-muted hover:text-foreground"
      >
        ← {test.title}
      </Link>

      <div className="mt-3">
        <PageHeader
          title="Результаты"
          description={`Показано: ${attempts.length} из ${raw.length}`}
        />
      </div>

      {raw.length > 0 && (
        <ListControls
          search={{ placeholder: "Имя ученика" }}
          filters={[
            {
              key: "state",
              label: "Любое состояние",
              options: [
                { value: "", label: "Любое состояние" },
                { value: "in_progress", label: "Проходит" },
                { value: "expired", label: "Время вышло" },
                { value: "submitted", label: "Сдан" },
                { value: "review", label: "Ждёт проверки" },
              ],
            },
          ]}
          sort={[
            { value: "recent", label: "Сначала свежие" },
            { value: "name", label: "По имени" },
            { value: "score", label: "По баллу" },
          ]}
        />
      )}

      {attempts.length === 0 ? (
        <EmptyState>
          {raw.length === 0
            ? "Тест ещё никто не проходил."
            : "Под фильтры ничего не подходит."}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2 text-left">
              <tr className="text-xs font-medium tracking-wide text-muted uppercase">
                <th className="px-4 py-3">Ученик</th>
                <th className="px-4 py-3">Начал</th>
                <th className="px-4 py-3">Состояние</th>
                <th className="px-4 py-3 text-right">Балл</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => {
                const state = attemptState({
                  startedAt: a.startedAt,
                  expiresAt: a.expiresAt,
                  submittedAt: a.submittedAt,
                });
                const pendingReview =
                  a.submittedAt && a.score === null;

                return (
                  <tr
                    key={a.attemptId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{a.fullName}</td>
                    <td className="px-4 py-3 text-muted">
                      {dateFormat.format(a.startedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {state === "submitted" ? (
                        <Badge
                          label={a.autoSubmitted ? "Сдан по времени" : "Сдан"}
                          style="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        />
                      ) : state === "expired" ? (
                        <Badge
                          label="Время вышло"
                          style="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        />
                      ) : (
                        <Badge
                          label="Проходит"
                          style="bg-sky-500/10 text-sky-600 dark:text-sky-400"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {a.submittedAt ? (
                        pendingReview ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {a.autoScore}/{a.maxScore} · проверить
                          </span>
                        ) : (
                          <span className="font-semibold">
                            {a.score}/{a.maxScore}
                          </span>
                        )
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pendingReview && (
                        <Link
                          href={`/tests/${test.id}/results/${a.attemptId}`}
                          className="text-accent hover:underline"
                        >
                          Проверить
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
