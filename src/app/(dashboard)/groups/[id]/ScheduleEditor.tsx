"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Select } from "@/components/Select";
import { Card, ErrorText, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { addSlot } from "@/lib/schedule/actions";
import { WEEKDAYS } from "@/lib/schedule/constants";

export function ScheduleEditor({ groupId }: { groupId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addSlot, {});

  return (
    <Card className="p-4">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input type="hidden" name="groupId" value={groupId} />

        <Field label="День недели">
          <Select
            name="weekday"
            defaultValue="0"
            options={WEEKDAYS.map((label, index) => ({
              value: String(index),
              label,
            }))}
          />
        </Field>

        <Field label="Начало">
          <Input
            name="startTime"
            type="time"
            defaultValue="18:00"
            required
            className="w-32"
          />
        </Field>

        <Field label="Мин.">
          <Input
            name="durationMin"
            type="number"
            min={15}
            max={600}
            defaultValue={90}
            className="w-24"
          />
        </Field>

        {state.error && (
          <div className="sm:col-span-3">
            <ErrorText>{state.error}</ErrorText>
          </div>
        )}

        <div className="sm:col-span-3">
          <SubmitButton>Добавить в расписание</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
