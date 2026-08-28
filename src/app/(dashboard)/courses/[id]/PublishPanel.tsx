"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Card, ErrorText, Field, Input } from "@/components/ui";
import { updateCoursePublish } from "@/lib/courses/public-actions";
import { slugify } from "@/lib/courses/slug";
import type { FormState } from "@/lib/form";

export function PublishPanel({
  courseId,
  isPublic,
  slug,
  enrollmentOpen,
}: {
  courseId: string;
  isPublic: boolean;
  slug: string | null;
  enrollmentOpen: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateCoursePublish,
    {},
  );
  const [slugValue, setSlugValue] = useState(slug ?? "");

  return (
    <Card className="p-5">
      <form action={action} className="grid gap-4">
        <input type="hidden" name="courseId" value={courseId} />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isPublic"
            defaultChecked={isPublic}
            className="h-4 w-4 accent-accent"
          />
          Показывать в каталоге и по ссылке
        </label>

        <Field
          label="Адрес страницы"
          hint="Латиницей. Итог: /c/<адрес>"
        >
          <Input
            name="slug"
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value)}
            onBlur={() => setSlugValue((v) => slugify(v))}
            placeholder="python-basics"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enrollmentOpen"
            defaultChecked={enrollmentOpen}
            className="h-4 w-4 accent-accent"
          />
          Принимать заявки на запись
        </label>

        {state.error && <ErrorText>{state.error}</ErrorText>}

        <div className="flex items-center gap-3">
          <SubmitButton>Сохранить</SubmitButton>
          {isPublic && slug && (
            <a
              href={`/c/${slug}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-accent hover:underline"
            >
              Открыть страницу →
            </a>
          )}
        </div>
      </form>
    </Card>
  );
}
