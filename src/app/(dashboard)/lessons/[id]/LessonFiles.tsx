"use client";

import { useActionState, useEffect, useRef } from "react";

import { SubmitButton } from "@/components/form-ui";
import { Card, ErrorText, IconButton } from "@/components/ui";
import type { FormState } from "@/lib/form";
import { deleteLessonFile, uploadLessonFile } from "@/lib/lessons/actions";
import { formatBytes } from "@/lib/storage-format";

type LessonFile = {
  id: string;
  name: string;
  size: number;
  /** Подписанная ссылка, живёт около часа. */
  url: string | null;
};

export function LessonFiles({
  lessonId,
  files,
  storageEnabled,
}: {
  lessonId: string;
  files: LessonFile[];
  storageEnabled: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    uploadLessonFile,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // После удачной загрузки очищаем выбранный файл.
  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <div className="grid gap-3">
      {files.length > 0 && (
        <Card className="divide-y divide-border">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden>📎</span>
                {file.url ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="truncate text-sm hover:text-accent"
                  >
                    {file.name}
                  </a>
                ) : (
                  <span className="truncate text-sm text-muted">{file.name}</span>
                )}
                <span className="shrink-0 text-xs text-muted">
                  {formatBytes(file.size)}
                </span>
              </div>

              <form action={deleteLessonFile}>
                <input type="hidden" name="lessonId" value={lessonId} />
                <input type="hidden" name="fileId" value={file.id} />
                <IconButton
                  type="submit"
                  title="Удалить материал"
                  className="hover:text-danger"
                >
                  ✕
                </IconButton>
              </form>
            </div>
          ))}
        </Card>
      )}

      {storageEnabled ? (
        <form ref={formRef} action={action} className="flex flex-wrap gap-2">
          <input type="hidden" name="lessonId" value={lessonId} />
          <input
            type="file"
            name="file"
            required
            className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-border"
          />
          <SubmitButton>Прикрепить</SubmitButton>

          {state.error && (
            <div className="w-full">
              <ErrorText>{state.error}</ErrorText>
            </div>
          )}
        </form>
      ) : (
        <p className="text-sm text-muted">
          Чтобы прикреплять файлы, настройте Supabase Storage — шаги описаны в
          README.
        </p>
      )}
    </div>
  );
}
