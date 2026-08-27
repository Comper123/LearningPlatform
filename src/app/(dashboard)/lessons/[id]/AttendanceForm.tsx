"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Card, ErrorText } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { attendanceStatus } from "@/lib/labels";
import { saveAttendance } from "@/lib/lessons/actions";

type Row = {
  studentId: string;
  fullName: string;
  attendanceStatus: keyof typeof attendanceStatus | null;
};

const options = Object.entries(attendanceStatus) as [
  keyof typeof attendanceStatus,
  { label: string; style: string },
][];

export function AttendanceForm({
  lessonId,
  rows,
}: {
  lessonId: string;
  rows: Row[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveAttendance,
    {},
  );

  return (
    <form action={action}>
      <input type="hidden" name="lessonId" value={lessonId} />

      <Card className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.studentId}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <span className="text-sm font-medium">{row.fullName}</span>

            <div className="flex flex-wrap gap-1">
              {options.map(([value, meta]) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-full text-xs font-medium opacity-55 transition hover:opacity-80 [&:has(:checked)]:opacity-100 [&:has(:checked)]:ring-2 [&:has(:checked)]:ring-accent [&:has(:checked)]:ring-offset-1 [&:has(:checked)]:ring-offset-surface"
                >
                  <input
                    type="radio"
                    name={`status:${row.studentId}`}
                    value={value}
                    defaultChecked={
                      row.attendanceStatus
                        ? row.attendanceStatus === value
                        : value === "present"
                    }
                    className="sr-only"
                  />
                  <span
                    className={`block rounded-full px-3 py-1.5 ${meta.style}`}
                  >
                    {meta.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </Card>

      {state.error && (
        <div className="mt-3">
          <ErrorText>{state.error}</ErrorText>
        </div>
      )}

      <div className="mt-4">
        <SubmitButton>Сохранить посещаемость</SubmitButton>
      </div>
    </form>
  );
}
