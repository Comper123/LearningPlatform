"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Select } from "@/components/Select";
import { Card, ErrorText, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { updateLesson } from "@/lib/lessons/actions";

export function LessonMeta({
  lessonId,
  status,
  summary,
  content,
}: {
  lessonId: string;
  status: "planned" | "done" | "cancelled";
  summary: string | null;
  content: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateLesson, {});

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="lessonId" value={lessonId} />

      <Card className="grid gap-4 p-5 sm:grid-cols-[200px_1fr]">
        <Field label="Статус занятия">
          <Select
            name="status"
            defaultValue={status}
            options={[
              { value: "planned", label: "Запланировано" },
              { value: "done", label: "Проведено" },
              { value: "cancelled", label: "Отменено" },
            ]}
          />
        </Field>

        <Field label="Краткий итог" hint="Одна строка — видна в списках">
          <Input
            name="summary"
            defaultValue={summary ?? ""}
            placeholder="Разобрали циклы, решили 5 задач"
          />
        </Field>
      </Card>

      <div>
        <h2 className="mb-1 font-medium">Содержание урока</h2>
        <p className="mb-3 text-sm text-muted">
          Конспект, план, примеры кода — в Markdown. Файлы прикрепляются
          отдельно, в блоке «Материалы урока» ниже.
        </p>
        <MarkdownEditor
          name="content"
          defaultValue={content ?? ""}
          placeholder={
            "## План\n\n1. Повторение\n2. Новая тема\n\n```python\nfor i in range(5):\n    print(i)\n```"
          }
        />
      </div>

      {state.error && <ErrorText>{state.error}</ErrorText>}

      <div>
        <SubmitButton>Сохранить занятие</SubmitButton>
      </div>
    </form>
  );
}
