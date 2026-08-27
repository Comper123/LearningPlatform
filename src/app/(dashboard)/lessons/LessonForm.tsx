"use client";

import { useActionState, useState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { AddForm } from "@/components/form-ui";
import { Select } from "@/components/Select";
import { Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { createLesson } from "@/lib/lessons/actions";

type Group = { id: string; title: string; courseId: string | null };
type Topic = { id: string; title: string; courseId: string };

export function LessonForm({
  groups,
  topics,
}: {
  groups: Group[];
  topics: Topic[];
}) {
  const [state, action] = useActionState<FormState, FormData>(createLesson, {});
  const [groupId, setGroupId] = useState("");

  // Темы показываем только те, что относятся к курсу выбранной группы.
  const courseId = groups.find((g) => g.id === groupId)?.courseId ?? null;
  const availableTopics = courseId
    ? topics.filter((t) => t.courseId === courseId)
    : [];

  return (
    <AddForm trigger="Новое занятие" state={state} action={action}>
      <Field label="Группа">
        <Select
          name="groupId"
          value={groupId}
          onChange={setGroupId}
          placeholder="Выберите группу…"
          options={groups.map((g) => ({ value: g.id, label: g.title }))}
        />
      </Field>

      <Field label="Тема из программы">
        <Select
          name="topicId"
          disabled={!availableTopics.length}
          placeholder={availableTopics.length ? "Без темы" : "Нет тем у курса"}
          options={[
            { value: "", label: "Без темы" },
            ...availableTopics.map((t) => ({ value: t.id, label: t.title })),
          ]}
        />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Название занятия">
          <Input name="title" required placeholder="Списки и словари" />
        </Field>
      </div>

      <Field label="Дата и время">
        <DatePicker name="startsAt" withTime defaultTime="18:00" />
      </Field>

      <Field label="Длительность, мин">
        <Input
          name="durationMin"
          type="number"
          min={15}
          max={600}
          defaultValue={90}
        />
      </Field>
    </AddForm>
  );
}
