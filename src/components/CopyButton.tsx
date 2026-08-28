"use client";

import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // буфер обмена недоступен — молча игнорируем
        }
      }}
      className="rounded-md border border-border px-2 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-foreground"
    >
      {done ? "Скопировано" : (label ?? "Копировать")}
    </button>
  );
}
