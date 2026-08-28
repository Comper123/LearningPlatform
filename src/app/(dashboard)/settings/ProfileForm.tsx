"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Card, ErrorText, Field, Input, Textarea } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { updateTeacherProfile } from "@/lib/profile/actions";

export function ProfileForm({
  name,
  headline,
  bio,
}: {
  name: string;
  headline: string;
  bio: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateTeacherProfile,
    {},
  );

  return (
    <Card className="max-w-xl p-5">
      <form action={action} className="grid gap-4">
        <Field label="Имя">
          <Input name="name" required defaultValue={name} />
        </Field>

        <Field label="Подпись" hint="Короткая строка под именем в каталоге">
          <Input
            name="headline"
            defaultValue={headline}
            placeholder="Преподаватель Python, 6 лет практики"
          />
        </Field>

        <Field label="О себе" hint="Виден на публичных страницах курсов">
          <Textarea name="bio" rows={4} defaultValue={bio} />
        </Field>

        {state.error && <ErrorText>{state.error}</ErrorText>}

        <div>
          <SubmitButton>Сохранить</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
