"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Card, ErrorText } from "@/components/ui";
import { setTestGroups } from "@/lib/tests/actions";
import type { FormState } from "@/lib/form";

export function GroupPicker({
  testId,
  groups,
  selected,
}: {
  testId: string;
  groups: { id: string; title: string }[];
  selected: string[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    setTestGroups,
    {},
  );
  const chosen = new Set(selected);

  return (
    <Card className="p-5">
      <form action={action} className="grid gap-3">
        <input type="hidden" name="testId" value={testId} />

        {groups.length === 0 ? (
          <p className="text-sm text-muted">
            Сначала создайте группы — тест назначается на них.
          </p>
        ) : (
          groups.map((group) => (
            <label key={group.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="groupId"
                value={group.id}
                defaultChecked={chosen.has(group.id)}
                className="h-4 w-4 accent-accent"
              />
              {group.title}
            </label>
          ))
        )}

        {state.error && <ErrorText>{state.error}</ErrorText>}

        {groups.length > 0 && <SubmitButton>Сохранить</SubmitButton>}
      </form>
    </Card>
  );
}
