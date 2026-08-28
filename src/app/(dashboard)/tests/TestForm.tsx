"use client";

import { useActionState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { AddForm } from "@/components/form-ui";
import { Field, Input, Textarea } from "@/components/ui";
import { createTest } from "@/lib/tests/actions";
import type { FormState } from "@/lib/form";

export function TestForm() {
  const [state, action] = useActionState<FormState, FormData>(createTest, {});

  return (
    <AddForm trigger="Новый тест" state={state} action={action}>
      <div className="sm:col-span-2">
        <Field label="Название">
          <Input name="title" required placeholder="Контрольная по циклам" />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="Описание">
          <Textarea name="description" rows={2} />
        </Field>
      </div>

      <Field label="Лимит времени, мин" hint="Пусто — без ограничения">
        <Input name="timeLimitMin" type="number" min={1} max={600} placeholder="30" />
      </Field>

      <label className="flex items-center gap-2 self-end text-sm">
        <input
          type="checkbox"
          name="revealAnswers"
          defaultChecked
          className="h-4 w-4 accent-accent"
        />
        Показывать разбор после сдачи
      </label>

      <Field label="Открыть с" hint="Необязательно">
        <DatePicker name="opensAt" withTime defaultTime="09:00" />
      </Field>

      <Field label="Закрыть в" hint="Необязательно">
        <DatePicker name="closesAt" withTime defaultTime="23:59" />
      </Field>
    </AddForm>
  );
}
