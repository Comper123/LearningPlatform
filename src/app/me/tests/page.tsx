import Link from "next/link";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireStudent } from "@/lib/session";
import { listStudentTests } from "@/lib/tests/student";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const stateBadge = {
  not_started: { label: "Не начат", style: "bg-zinc-500/10 text-muted" },
  in_progress: {
    label: "Можно продолжить",
    style: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  expired: {
    label: "Время вышло",
    style: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  submitted: {
    label: "Сдан",
    style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
} as const;

export default async function StudentTestsPage() {
  const { student } = await requireStudent();
  const tests = await listStudentTests(student.id);

  return (
    <>
      <PageHeader title="Тесты" description="Проверочные работы" />

      {tests.length === 0 ? (
        <EmptyState>Тестов пока нет.</EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {tests.map((test) => (
            <Link
              key={test.id}
              href={`/me/tests/${test.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{test.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {test.timeLimitMin
                    ? `${test.timeLimitMin} мин`
                    : "без лимита"}
                  {test.closesAt
                    ? ` · до ${dateFormat.format(test.closesAt)}`
                    : ""}
                  {test.state === "submitted" && test.attempt
                    ? test.attempt.score !== null
                      ? ` · ${test.attempt.score}/${test.attempt.maxScore}`
                      : " · на проверке"
                    : ""}
                </p>
              </div>

              <Badge {...stateBadge[test.state]} />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
