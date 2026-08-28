"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Button, Card, ErrorText, IconButton } from "@/components/ui";
import { deleteQuestion, updateQuestion } from "@/lib/tests/actions";
import type { FormState } from "@/lib/form";
import { QUESTION_TYPES, type QuestionType } from "@/lib/tests/question-meta";

import { QuestionFields } from "./QuestionFields";

type Option = { id: string; text: string; isCorrect: boolean };

export function QuestionCard({
  testId,
  index,
  question,
  locked,
}: {
  testId: string;
  index: number;
  question: {
    id: string;
    type: QuestionType;
    prompt: string;
    points: number;
    options: Option[];
  };
  /** По тесту уже есть сдачи — редактировать нельзя. */
  locked: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(
    updateQuestion,
    {},
  );

  const meta = QUESTION_TYPES[question.type];
  const optionsText = question.options
    .map((o) => (o.isCorrect ? `*${o.text}` : o.text))
    .join("\n");

  if (editing) {
    return (
      <Card className="p-4">
        <form
          action={action}
          className="grid gap-4 sm:grid-cols-2"
        >
          <input type="hidden" name="testId" value={testId} />
          <input type="hidden" name="questionId" value={question.id} />

          <QuestionFields
            defaultType={question.type}
            defaultPrompt={question.prompt}
            defaultPoints={question.points}
            defaultOptions={optionsText}
          />

          {state.error && (
            <div className="sm:col-span-2">
              <ErrorText>{state.error}</ErrorText>
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <SubmitButton>Сохранить вопрос</SubmitButton>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.style}`}
            >
              {meta.label}
            </span>
            <span className="text-xs text-muted">
              {question.points} балл(ов)
            </span>
          </div>
          <p className="mt-2 text-sm font-medium">
            {index}. {question.prompt}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!locked && (
            <IconButton
              type="button"
              title="Изменить вопрос"
              onClick={() => setEditing(true)}
            >
              ✎
            </IconButton>
          )}
          {!locked && (
            <form action={deleteQuestion}>
              <input type="hidden" name="testId" value={testId} />
              <input type="hidden" name="questionId" value={question.id} />
              <IconButton
                type="submit"
                title="Удалить вопрос"
                className="hover:text-danger"
              >
                ✕
              </IconButton>
            </form>
          )}
        </div>
      </div>

      {question.options.length > 0 && (
        <ul className="mt-3 grid gap-1 text-sm">
          {question.options.map((o) => (
            <li
              key={o.id}
              className={
                o.isCorrect
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted"
              }
            >
              {o.isCorrect ? "✓ " : "• "}
              {o.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
