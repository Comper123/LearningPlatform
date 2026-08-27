"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Select } from "@/components/Select";
import { Input, Textarea } from "@/components/ui";
import { reviewSubmission } from "@/lib/assignments/actions";
import type { FormState } from "@/lib/form";
import { submissionStatus } from "@/lib/labels";

type Row = {
  studentId: string;
  fullName: string;
  status: keyof typeof submissionStatus;
  url: string | null;
  codeText: string | null;
  codeLang: string | null;
  fileName: string | null;
  /** Подписанная ссылка на вложение, живёт около часа. */
  fileUrl: string | null;
  score: number | null;
  feedback: string | null;
};

export function ReviewRow({
  assignmentId,
  row,
  maxScore,
}: {
  assignmentId: string;
  row: Row;
  maxScore: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    reviewSubmission,
    {},
  );

  return (
    <form action={action} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="studentId" value={row.studentId} />

      <div className="min-w-0">
        <p className="text-sm font-medium">{row.fullName}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {row.url && (
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer noopener"
              className="max-w-full truncate text-accent hover:underline"
            >
              {row.url}
            </a>
          )}

          {row.fileUrl && row.fileName && (
            <a
              href={row.fileUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent hover:underline"
            >
              📎 {row.fileName}
            </a>
          )}

          {row.fileName && !row.fileUrl && (
            <span className="text-muted">📎 {row.fileName} (ссылка недоступна)</span>
          )}
        </div>

        {row.codeText && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
              Код решения ({row.codeLang ?? "text"})
            </summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs leading-relaxed">
              {row.codeText}
            </pre>
          </details>
        )}

        <Textarea
          name="feedback"
          rows={2}
          defaultValue={row.feedback ?? ""}
          placeholder="Комментарий ученику"
          className="mt-2 w-full"
        />

        {state.error && (
          <p className="mt-2 text-sm text-danger">{state.error}</p>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <Select
          name="status"
          defaultValue={row.status}
          className="w-44"
          options={Object.entries(submissionStatus).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
        />

        <Input
          name="score"
          type="number"
          min={0}
          max={maxScore}
          defaultValue={row.score ?? ""}
          placeholder={`из ${maxScore}`}
          className="w-24"
        />

        <SubmitButton>Сохранить</SubmitButton>
      </div>
    </form>
  );
}
