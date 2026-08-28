"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { ErrorText, Textarea } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { requestCourseEnrollment } from "@/lib/courses/public-actions";

export function EnrollForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    requestCourseEnrollment,
    {},
  );

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="courseId" value={courseId} />

      <Textarea
        name="message"
        rows={3}
        placeholder="Пара слов о себе и целях (необязательно)"
      />

      {state.error && <ErrorText>{state.error}</ErrorText>}

      <div>
        <SubmitButton>Записаться на курс</SubmitButton>
      </div>
    </form>
  );
}
