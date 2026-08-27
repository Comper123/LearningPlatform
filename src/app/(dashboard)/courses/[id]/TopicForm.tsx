"use client";

import { useActionState } from "react";

import { AddForm } from "@/components/form-ui";
import { Field, Input, Textarea } from "@/components/ui";
import { createTopic } from "@/lib/courses/actions";
import type { FormState } from "@/lib/form";

export function TopicForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState<FormState, FormData>(createTopic, {});

  return (
    <AddForm trigger="Добавить тему" state={state} action={action}>
      <input type="hidden" name="courseId" value={courseId} />

      <div className="sm:col-span-2">
        <Field label="Название темы">
          <Input name="title" required placeholder="Циклы и условия" />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="Что разбираем">
          <Textarea name="description" rows={2} />
        </Field>
      </div>
    </AddForm>
  );
}
