"use client";

import { useActionState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { AddForm } from "@/components/form-ui";
import { Select } from "@/components/Select";
import { Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { createGroup } from "@/lib/groups/actions";

export function GroupForm({
  courses,
}: {
  courses: { id: string; title: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(createGroup, {});

  return (
    <AddForm trigger="Новая группа" state={state} action={action}>
      <Field label="Название">
        <Input name="title" required placeholder="Python-1, вторник" />
      </Field>

      <Field label="Курс">
        <Select
          name="courseId"
          placeholder="Без курса"
          options={[
            { value: "", label: "Без курса" },
            ...courses.map((c) => ({ value: c.id, label: c.title })),
          ]}
        />
      </Field>

      <Field label="Расписание">
        <Input name="scheduleNote" placeholder="Пн, Ср 18:00" />
      </Field>

      <Field label="Старт">
        <DatePicker name="startsOn" />
      </Field>

      <Field label="Статус">
        <Select
          name="status"
          defaultValue="active"
          options={[
            { value: "planned", label: "Набор" },
            { value: "active", label: "Идёт" },
            { value: "finished", label: "Завершена" },
          ]}
        />
      </Field>
    </AddForm>
  );
}
