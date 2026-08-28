"use client";

import { useActionState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { SubmitButton } from "@/components/form-ui";
import { Card, ErrorText, Field, Input, Textarea } from "@/components/ui";
import { updateTest } from "@/lib/tests/actions";
import type { FormState } from "@/lib/form";

function isoLocal(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TestSettings({
  test,
}: {
  test: {
    id: string;
    title: string;
    description: string | null;
    timeLimitMin: number | null;
    opensAt: Date | null;
    closesAt: Date | null;
    revealAnswers: boolean;
  };
}) {
  const [state, action] = useActionState<FormState, FormData>(updateTest, {});

  return (
    <Card className="p-5">
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="testId" value={test.id} />

        <div className="sm:col-span-2">
          <Field label="Название">
            <Input name="title" required defaultValue={test.title} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Описание">
            <Textarea name="description" rows={2} defaultValue={test.description ?? ""} />
          </Field>
        </div>

        <Field label="Лимит времени, мин" hint="Пусто — без ограничения">
          <Input
            name="timeLimitMin"
            type="number"
            min={1}
            max={600}
            defaultValue={test.timeLimitMin ?? ""}
          />
        </Field>

        <label className="flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            name="revealAnswers"
            defaultChecked={test.revealAnswers}
            className="h-4 w-4 accent-accent"
          />
          Показывать разбор после сдачи
        </label>

        <Field label="Открыть с">
          <DatePicker
            name="opensAt"
            withTime
            defaultValue={isoLocal(test.opensAt)}
            defaultTime="09:00"
          />
        </Field>

        <Field label="Закрыть в">
          <DatePicker
            name="closesAt"
            withTime
            defaultValue={isoLocal(test.closesAt)}
            defaultTime="23:59"
          />
        </Field>

        {state.error && (
          <div className="sm:col-span-2">
            <ErrorText>{state.error}</ErrorText>
          </div>
        )}

        <div className="sm:col-span-2">
          <SubmitButton>Сохранить настройки</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
