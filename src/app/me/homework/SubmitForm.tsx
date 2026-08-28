"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Select } from "@/components/Select";
import { controlClass, ErrorText, Field, Input } from "@/components/ui";
import { submitWork } from "@/lib/assignments/actions";
import type { FormState } from "@/lib/form";

const LANGS = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "text", label: "Другое" },
];

type Mode = "link" | "code" | "file";

export function SubmitForm({
  assignmentId,
  url,
  codeText,
  codeLang,
  fileName,
  storageEnabled,
}: {
  assignmentId: string;
  url: string | null;
  codeText: string | null;
  codeLang: string | null;
  fileName: string | null;
  storageEnabled: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(submitWork, {});

  // Открываем на том способе, которым уже сдавали.
  const [mode, setMode] = useState<Mode>(
    codeText ? "code" : fileName ? "file" : "link",
  );

  const tabs: { value: Mode; label: string }[] = [
    { value: "link", label: "Ссылка" },
    { value: "code", label: "Код" },
    ...(storageEnabled ? [{ value: "file" as const, label: "Файл" }] : []),
  ];

  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />

      <div className="flex w-fit rounded-lg border border-border p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setMode(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              mode === tab.value
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Поля не размонтируем — иначе при переключении вкладки
          потерялось бы то, что уже было сдано другим способом. */}
      <div className={mode === "link" ? "" : "hidden"}>
        <Field label="Ссылка на решение">
          <Input
            name="url"
            type="url"
            defaultValue={url ?? ""}
            placeholder="https://github.com/… или ссылка на песочницу"
          />
        </Field>
      </div>

      <div className={mode === "code" ? "grid gap-3" : "hidden"}>
        <Field label="Язык">
          <Select
            name="codeLang"
            defaultValue={codeLang ?? "python"}
            options={LANGS}
            className="w-48"
          />
        </Field>

        <Field label="Код решения">
          <textarea
            name="codeText"
            rows={12}
            defaultValue={codeText ?? ""}
            spellCheck={false}
            placeholder={"def solve(n):\n    return n * 2"}
            className={`${controlClass} font-mono text-xs leading-relaxed`}
          />
        </Field>
      </div>

      {storageEnabled && (
        <div className={mode === "file" ? "" : "hidden"}>
          <Field
            label="Файл"
            hint={
              fileName
                ? `Уже приложен: ${fileName}. Новый файл заменит его.`
                : "До 20 МБ — исходник или архив"
            }
          >
            <input
              type="file"
              name="file"
              className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-fg hover:file:brightness-110"
            />
          </Field>
        </div>
      )}

      {state.error && <ErrorText>{state.error}</ErrorText>}

      <div>
        <SubmitButton>Сдать работу</SubmitButton>
      </div>
    </form>
  );
}
