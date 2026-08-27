"use client";

import { useActionState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { SubmitButton } from "@/components/form-ui";
import { Card, ErrorText, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { generateLessons } from "@/lib/schedule/actions";

function todayKey() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function GenerateForm({
  groupId,
  hasSlots,
  hasCourse,
}: {
  groupId: string;
  hasSlots: boolean;
  hasCourse: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    generateLessons,
    {},
  );

  if (!hasSlots) {
    return (
      <p className="text-sm text-muted">
        Добавьте хотя бы один слот — и занятия можно будет расставить
        автоматически на несколько недель вперёд.
      </p>
    );
  }

  return (
    <Card className="p-4">
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="groupId" value={groupId} />

        <Field label="Начиная с">
          <DatePicker name="from" defaultValue={todayKey()} />
        </Field>

        <Field label="На сколько недель">
          <Input
            name="weeks"
            type="number"
            min={1}
            max={52}
            defaultValue={8}
          />
        </Field>

        {hasCourse && (
          <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="withTopics"
              defaultChecked
              className="mt-0.5 h-4 w-4 accent-accent"
            />
            <span>
              Проставить темы из программы курса по порядку
              <span className="block text-xs text-muted">
                Берутся только те темы, которых ещё нет ни в одном занятии
                группы — курс продолжится, а не начнётся заново.
              </span>
            </span>
          </label>
        )}

        {state.error && (
          <div className="sm:col-span-2">
            <ErrorText>{state.error}</ErrorText>
          </div>
        )}

        <div className="sm:col-span-2">
          <SubmitButton>Расставить занятия</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
