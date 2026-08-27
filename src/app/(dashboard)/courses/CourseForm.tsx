"use client";

import { useActionState } from "react";

import { AddForm } from "@/components/form-ui";
import { Field, Input, Textarea } from "@/components/ui";
import { createCourse } from "@/lib/courses/actions";
import type { FormState } from "@/lib/form";

export function CourseForm() {
  const [state, action] = useActionState<FormState, FormData>(createCourse, {});

  return (
    <AddForm trigger="Новый курс" state={state} action={action}>
      <Field label="Название">
        <Input name="title" required placeholder="Python с нуля" />
      </Field>

      <Field label="Уровень">
        <Input name="level" placeholder="Начальный" />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Описание">
          <Textarea name="description" rows={3} placeholder="Для кого курс, чему учит" />
        </Field>
      </div>
    </AddForm>
  );
}
