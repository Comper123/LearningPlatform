"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button, Card, ErrorText } from "@/components/ui";
import type { FormState } from "@/lib/form";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending && <Spinner />}
      {pending ? "Сохраняю…" : children}
    </Button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

/**
 * Кнопка «добавить», раскрывающаяся в форму: после успешной отправки
 * поля очищаются, ошибка остаётся на месте.
 */
export function AddForm({
  trigger,
  state,
  action,
  children,
  className = "max-w-2xl",
}: {
  trigger: string;
  state: FormState;
  action: (formData: FormData) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open && !state.error) formRef.current?.reset();
  }, [state, open]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        {trigger}
      </Button>
    );
  }

  return (
    <Card className={`w-full p-6 ${className}`}>
      <form ref={formRef} action={action} className="grid gap-5 sm:grid-cols-2">
        {children}

        {state.error && (
          <div className="sm:col-span-2">
            <ErrorText>{state.error}</ErrorText>
          </div>
        )}

        <div className="flex gap-2 sm:col-span-2">
          <SubmitButton>{trigger}</SubmitButton>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 2.5v9M2.5 7h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
