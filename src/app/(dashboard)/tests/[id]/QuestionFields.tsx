"use client";

import { useState } from "react";

import { Field, Input, Textarea } from "@/components/ui";
import { QUESTION_TYPES, type QuestionType } from "@/lib/tests/question-meta";

/**
 * Общие поля вопроса — используются и при добавлении, и при
 * редактировании. Тип выбирается кнопками, а не выпадающим списком:
 * так сразу видно все варианты и их смысл.
 */
export function QuestionFields({
  defaultType = "single",
  defaultPrompt = "",
  defaultPoints = 1,
  defaultOptions = "",
}: {
  defaultType?: QuestionType;
  defaultPrompt?: string;
  defaultPoints?: number;
  defaultOptions?: string;
}) {
  const [type, setType] = useState<QuestionType>(defaultType);
  const withOptions = type !== "text";

  return (
    <>
      <input type="hidden" name="type" value={type} />

      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">
          Тип вопроса
        </span>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(QUESTION_TYPES) as QuestionType[]).map((key) => {
            const meta = QUESTION_TYPES[key];
            const active = type === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.style}`}
                >
                  {meta.short}
                </span>
                <span className="mt-1.5 block text-sm font-medium">
                  {meta.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {meta.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Балл за вопрос">
        <Input
          name="points"
          type="number"
          min={1}
          max={100}
          defaultValue={defaultPoints}
        />
      </Field>

      {/* Для симметрии сетки — пустая ячейка рядом с баллом. */}
      <div className="hidden sm:block" />

      <div className="sm:col-span-2">
        <Field label="Вопрос">
          <Textarea
            name="prompt"
            rows={2}
            required
            defaultValue={defaultPrompt}
            placeholder="Что выведет код?"
          />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field
          label="Варианты"
          hint={
            withOptions
              ? "По одному в строке. Верный — со звёздочкой в начале: *42"
              : "Свободный ответ проверяется вручную, варианты не нужны"
          }
        >
          <Textarea
            name="optionsRaw"
            rows={5}
            disabled={!withOptions}
            defaultValue={defaultOptions}
            placeholder={"*42\n0\n24\nОшибка"}
            className="font-mono text-xs"
          />
        </Field>
      </div>
    </>
  );
}
