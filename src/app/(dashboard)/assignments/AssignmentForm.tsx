"use client";

import { useActionState, useState } from "react";

import { DatePicker } from "@/components/DatePicker";
import { AddForm } from "@/components/form-ui";
import { Select } from "@/components/Select";
import { Field, Input, Textarea } from "@/components/ui";
import { createAssignment } from "@/lib/assignments/actions";
import type { FormState } from "@/lib/form";

type Group = { id: string; title: string; courseId: string | null };
type Topic = { id: string; title: string; courseId: string };

export function AssignmentForm({
  groups,
  topics,
}: {
  groups: Group[];
  topics: Topic[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createAssignment,
    {},
  );
  const [groupId, setGroupId] = useState("");

  const courseId = groups.find((g) => g.id === groupId)?.courseId ?? null;
  const availableTopics = courseId
    ? topics.filter((t) => t.courseId === courseId)
    : [];

  return (
    <AddForm trigger="Новое задание" state={state} action={action}>
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
        <Field label="Название">
          <Input name="title" required placeholder="Калькулятор на функциях" />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="Условие">
          <Textarea name="description" rows={3} />
        </Field>
      </div>

      <Field label="Срок сдачи" hint="Можно не указывать">
        <DatePicker name="dueAt" withTime defaultTime="23:59" />
      </Field>

      <Field label="Максимальный балл">
        <Input
          name="maxScore"
          type="number"
          min={1}
          max={1000}
          defaultValue={100}
        />
      </Field>
    </AddForm>
  );
}
