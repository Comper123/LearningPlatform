"use client";

import { useState } from "react";

import { AuthForm, CodeField, NameField } from "@/components/auth-forms";
import { onboardAsStudent, onboardAsTeacher } from "@/lib/auth-actions";

type Choice = "student" | "teacher";

export function OnboardingForms({ defaultName }: { defaultName: string }) {
  const [choice, setChoice] = useState<Choice>("student");

  return (
    <div className="mt-6">
      <div className="flex gap-1 rounded-lg bg-background p-1">
        {(
          [
            ["student", "Я ученик"],
            ["teacher", "Я преподаватель"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setChoice(value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
              choice === value
                ? "bg-surface font-medium shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {choice === "student" ? (
          <AuthForm action={onboardAsStudent} submitLabel="Продолжить">
            <NameField defaultValue={defaultName} />
            <CodeField
              label="Код преподавателя (необязательно)"
              required={false}
              hint="Без кода вы попадёте в каталог курсов и сможете записаться сами."
            />
          </AuthForm>
        ) : (
          <AuthForm action={onboardAsTeacher} submitLabel="Продолжить">
            <CodeField
              label="Ключ доступа"
              required={false}
              hint="Можно не заполнять, если ваш email уже в списке преподавателей."
            />
          </AuthForm>
        )}
      </div>
    </div>
  );
}
