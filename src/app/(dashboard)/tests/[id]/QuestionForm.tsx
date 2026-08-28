"use client";

import { useActionState } from "react";

import { AddForm } from "@/components/form-ui";
import { addQuestion } from "@/lib/tests/actions";
import type { FormState } from "@/lib/form";

import { QuestionFields } from "./QuestionFields";

export function QuestionForm({ testId }: { testId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addQuestion, {});

  return (
    <AddForm trigger="Добавить вопрос" state={state} action={action}>
      <input type="hidden" name="testId" value={testId} />
      <QuestionFields />
    </AddForm>
  );
}
