"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { ErrorText, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/** Общая обвязка для форм входа и регистрации. */
export function AuthForm({
  action,
  submitLabel,
  children,
}: {
  action: Action;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="grid gap-4">
      {children}

      {state.error && <ErrorText>{state.error}</ErrorText>}

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

export function EmailField({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Field label="Email">
      <Input name="email" type="email" required defaultValue={defaultValue} />
    </Field>
  );
}

export function PasswordField({ isNew = false }: { isNew?: boolean }) {
  return (
    <Field label={isNew ? "Пароль (от 8 символов)" : "Пароль"}>
      <Input
        name="password"
        type="password"
        required
        minLength={isNew ? 8 : undefined}
        autoComplete={isNew ? "new-password" : "current-password"}
      />
    </Field>
  );
}

export function NameField({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Field label="Имя и фамилия">
      <Input name="fullName" required defaultValue={defaultValue} />
    </Field>
  );
}

export function CodeField({
  label,
  hint,
  required = true,
}: {
  label: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Field label={label}>
        <Input
          name="code"
          required={required}
          placeholder="K7QF-2M9X"
          autoCapitalize="characters"
          className="uppercase"
        />
      </Field>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
