"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Select } from "@/components/Select";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { createStudent, type StudentFormState } from "@/lib/students/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Сохраняю…" : "Добавить ученика"}
    </Button>
  );
}

export function StudentForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<StudentFormState, FormData>(
    createStudent,
    {},
  );

  // Успешная отправка — форма очищается и сворачивается.
  useEffect(() => {
    if (open && state && !state.error) {
      formRef.current?.reset();
    }
  }, [state, open]);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Новый ученик</Button>;
  }

  return (
    <Card className="w-full max-w-xl p-5">
      <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Имя и фамилия">
            <Input name="fullName" required placeholder="Иван Петров" />
          </Field>
        </div>

        <Field label="Email (по нему ученик войдёт через Google)">
          <Input name="email" type="email" placeholder="ivan@example.com" />
        </Field>

        <Field label="Телефон">
          <Input name="phone" placeholder="+7 900 000-00-00" />
        </Field>

        <Field label="Telegram">
          <Input name="telegram" placeholder="@ivan" />
        </Field>

        <Field label="Статус">
          <Select
            name="status"
            defaultValue="active"
            options={[
              { value: "active", label: "Учится" },
              { value: "paused", label: "Пауза" },
              { value: "archived", label: "Архив" },
            ]}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Заметки">
            <Textarea name="notes" rows={3} placeholder="Цели, уровень, особенности" />
          </Field>
        </div>

        {state.error && (
          <p className="text-sm text-danger sm:col-span-2">{state.error}</p>
        )}

        <div className="flex gap-2 sm:col-span-2">
          <SubmitButton />
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Button>
        </div>
      </form>
    </Card>
  );
}
