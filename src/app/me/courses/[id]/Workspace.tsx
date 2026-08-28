"use client";

import Link from "next/link";
import { useState } from "react";

import { Markdown } from "@/components/Markdown";
import { Badge, Card, EmptyState } from "@/components/ui";
import { attendanceStatus, submissionStatus } from "@/lib/labels";
import { formatDuration } from "@/lib/tests/logic";

import { SubmitForm } from "@/app/me/homework/SubmitForm";

type Tab = "lessons" | "homework" | "tests" | "program";

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
const shortFmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" });

type LessonFile = { id: string; name: string; size: number; url: string | null };

export type WorkspaceData = {
  lessons: {
    id: string;
    title: string;
    startsAt: string;
    durationMin: number;
    status: "planned" | "done" | "cancelled";
    summary: string | null;
    content: string | null;
    topicTitle: string | null;
    attendanceStatus: keyof typeof attendanceStatus | null;
    files: LessonFile[];
  }[];
  assignments: {
    assignmentId: string;
    title: string;
    dueAt: string | null;
    maxScore: number;
    status: keyof typeof submissionStatus;
    url: string | null;
    codeText: string | null;
    codeLang: string | null;
    fileName: string | null;
    score: number | null;
    feedback: string | null;
  }[];
  tests: {
    id: string;
    title: string;
    timeLimitMin: number | null;
    closesAt: string | null;
    state: "not_started" | "in_progress" | "expired" | "submitted";
    attempt: { score: number | null; maxScore: number } | null;
  }[];
  program: {
    topicId: string;
    title: string;
    level: number | null;
  }[];
  storageEnabled: boolean;
};

const testStateBadge = {
  not_started: { label: "Не начат", style: "bg-zinc-500/10 text-muted" },
  in_progress: { label: "Можно продолжить", style: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  expired: { label: "Время вышло", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  submitted: { label: "Сдан", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
} as const;

function fmtBytes(b: number) {
  if (b < 1024) return `${b} Б`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} КБ`;
  return `${(b / 1024 / 1024).toFixed(1)} МБ`;
}

export function Workspace({ data }: { data: WorkspaceData }) {
  const [tab, setTab] = useState<Tab>("lessons");

  const now = Date.now();
  const pendingHw = data.assignments.filter(
    (a) => a.status === "assigned" || a.status === "redo",
  ).length;
  const openTests = data.tests.filter(
    (t) => t.state === "not_started" || t.state === "in_progress",
  ).length;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "lessons", label: "Занятия" },
    { key: "homework", label: "Домашние задания", badge: pendingHw || undefined },
    { key: "tests", label: "Тесты", badge: openTests || undefined },
    { key: "program", label: "Программа" },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`relative -mb-px border-b-2 px-4 py-2 text-sm transition ${
              tab === t.key
                ? "border-accent font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 text-xs text-accent-fg">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- занятия */}
      {tab === "lessons" && (
        <div className="grid gap-2">
          {data.lessons.length === 0 && <EmptyState>Занятий пока нет.</EmptyState>}

          {data.lessons.map((lesson) => {
            const past = new Date(lesson.startsAt).getTime() < now;
            return (
              <details
                key={lesson.id}
                className="group rounded-xl border border-border bg-surface"
                open={past && !!lesson.content}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{lesson.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {dateFmt.format(new Date(lesson.startsAt))} ·{" "}
                      {lesson.durationMin} мин
                      {lesson.topicTitle ? ` · ${lesson.topicTitle}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {lesson.attendanceStatus && (
                      <Badge {...attendanceStatus[lesson.attendanceStatus]} />
                    )}
                  </div>
                </summary>

                <div className="border-t border-border px-4 py-3">
                  {lesson.summary && (
                    <p className="mb-3 text-sm text-muted">{lesson.summary}</p>
                  )}

                  {lesson.content ? (
                    <Markdown>{lesson.content}</Markdown>
                  ) : (
                    <p className="text-sm text-muted">Материалов по занятию нет.</p>
                  )}

                  {lesson.files.length > 0 && (
                    <div className="mt-4 grid gap-1">
                      <p className="text-xs font-medium text-muted uppercase">
                        Файлы
                      </p>
                      {lesson.files.map((f) =>
                        f.url ? (
                          <a
                            key={f.id}
                            href={f.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-sm text-accent hover:underline"
                          >
                            📎 {f.name}{" "}
                            <span className="text-xs text-muted">
                              {fmtBytes(f.size)}
                            </span>
                          </a>
                        ) : (
                          <span key={f.id} className="text-sm text-muted">
                            📎 {f.name}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {/* -------------------------------------------- домашние задания */}
      {tab === "homework" && (
        <div className="grid gap-4">
          {data.assignments.length === 0 && (
            <EmptyState>Заданий пока нет.</EmptyState>
          )}

          {data.assignments.map((a) => (
            <Card key={a.assignmentId} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{a.title}</h3>
                  {a.dueAt && (
                    <p className="mt-1 text-xs text-muted">
                      Срок: {dateFmt.format(new Date(a.dueAt))}
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
                <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-muted">
                  {a.feedback}
                </p>
              )}

              {a.status !== "reviewed" && (
                <SubmitForm
                  assignmentId={a.assignmentId}
                  url={a.url}
                  codeText={a.codeText}
                  codeLang={a.codeLang}
                  fileName={a.fileName}
                  storageEnabled={data.storageEnabled}
                />
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------ тесты */}
      {tab === "tests" && (
        <div className="grid gap-2">
          {data.tests.length === 0 && <EmptyState>Тестов пока нет.</EmptyState>}

          {data.tests.map((t) => (
            <Link
              key={t.id}
              href={`/me/tests/${t.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-accent"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {t.timeLimitMin
                    ? `${formatDuration(t.timeLimitMin * 60000)} на прохождение`
                    : "без лимита"}
                  {t.closesAt
                    ? ` · до ${shortFmt.format(new Date(t.closesAt))}`
                    : ""}
                  {t.state === "submitted" && t.attempt
                    ? t.attempt.score !== null
                      ? ` · ${t.attempt.score}/${t.attempt.maxScore}`
                      : " · на проверке"
                    : ""}
                </p>
              </div>
              <Badge {...testStateBadge[t.state]} />
            </Link>
          ))}
        </div>
      )}

      {/* --------------------------------------------------- программа */}
      {tab === "program" && (
        <Card className="divide-y divide-border">
          {data.program.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Программа появится позже.
            </p>
          )}
          {data.program.map((topic, i) => (
            <div
              key={topic.topicId}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <p className="text-sm">
                {i + 1}. {topic.title}
              </p>
              <div className="flex shrink-0 gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`h-2 w-2 rounded-full ${
                      topic.level && topic.level >= n
                        ? "bg-accent"
                        : "bg-surface-2"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
