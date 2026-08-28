"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Card, ErrorText, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { updateStudentProfile } from "@/lib/profile/actions";

export function ProfileForm({
  fullName,
  phone,
  telegram,
}: {
  fullName: string;
  phone: string;
  telegram: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateStudentProfile,
    {},
  );

  return (
    <Card className="max-w-xl p-5">
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Имя и фамилия">
            <Input name="fullName" required defaultValue={fullName} />
          </Field>
        </div>

        <Field label="Телефон">
          <Input name="phone" defaultValue={phone} placeholder="+7 900 000-00-00" />
        </Field>

        <Field label="Telegram">
          <Input name="telegram" defaultValue={telegram} placeholder="@nickname" />
        </Field>

        {state.error && (
          <div className="sm:col-span-2">
            <ErrorText>{state.error}</ErrorText>
          </div>
        )}

        <div className="sm:col-span-2">
          <SubmitButton>Сохранить</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
