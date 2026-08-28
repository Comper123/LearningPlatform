"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Card } from "@/components/ui";
import { saveAnswer } from "@/lib/tests/student-actions";
import type { FormState } from "@/lib/form";

type Option = { id: string; text: string };

type Question = {
  id: string;
  type: "single" | "multiple" | "text";
  prompt: string;
  points: number;
  options: Option[];
};

export function AnswerCard({
  testId,
  index,
  question,
  savedOptionIds,
  savedText,
}: {
  testId: string;
  index: number;
  question: Question;
  savedOptionIds: string[];
  savedText: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveAnswer, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Автосохранение с задержкой: не дёргаем сервер на каждый штрих в тексте.
  function scheduleSave() {
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => formRef.current?.requestSubmit(), 800);
  }

  useEffect(() => {
    if (!state.error) setDirty(false);
  }, [state]);

  const saved = new Set(savedOptionIds);

  return (
    <Card className="p-5">
      <form ref={formRef} action={action} onChange={scheduleSave}>
        <input type="hidden" name="testId" value={testId} />
        <input type="hidden" name="questionId" value={question.id} />

        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium">
            {index}. {question.prompt}
          </p>
          <span className="shrink-0 text-xs text-muted">
            {question.points} балл(ов)
          </span>
        </div>

        <div className="mt-3 grid gap-2">
          {question.type === "text" ? (
            <textarea
              name="text"
              rows={4}
              defaultValue={savedText ?? ""}
              placeholder="Ваш ответ"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          ) : (
            question.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm transition hover:bg-surface-2 [&:has(:checked)]:border-accent [&:has(:checked)]:bg-accent-soft"
              >
                <input
                  type={question.type === "single" ? "radio" : "checkbox"}
                  name="optionId"
                  value={option.id}
                  defaultChecked={saved.has(option.id)}
                  className="h-4 w-4 accent-accent"
                />
                {option.text}
              </label>
            ))
          )}
        </div>

        <p className="mt-2 text-xs text-muted">
          {state.error
            ? state.error
            : dirty
              ? "Сохраняю…"
              : "Сохранено"}
        </p>
      </form>
    </Card>
  );
}
