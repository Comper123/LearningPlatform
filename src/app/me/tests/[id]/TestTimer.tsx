"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { formatDuration } from "@/lib/tests/logic";
import { autoSubmitExpired } from "@/lib/tests/student-actions";

/**
 * Обратный отсчёт до `expiresAt`. Когда время выходит, просит сервер
 * досдать попытку и обновляет страницу — дальше показывается результат.
 * Сервер всё равно перепроверяет время, таймер здесь только для UX.
 */
export function TestTimer({
  testId,
  expiresAtIso,
}: {
  testId: string;
  expiresAtIso: string;
}) {
  const expiresAt = new Date(expiresAtIso).getTime();
  const [left, setLeft] = useState(() => expiresAt - Date.now());
  const firedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const tick = setInterval(() => {
      const remaining = expiresAt - Date.now();
      setLeft(remaining);

      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(tick);
        autoSubmitExpired(testId).finally(() => router.refresh());
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [expiresAt, testId, router]);

  const danger = left <= 60_000;

  return (
    <div
      className={`sticky top-4 z-10 flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
        danger
          ? "border-danger bg-danger/10 text-danger"
          : "border-border bg-surface"
      }`}
    >
      <span>Осталось времени</span>
      <span className="font-mono text-base font-semibold tabular-nums">
        {left > 0 ? formatDuration(left) : "0:00"}
      </span>
    </div>
  );
}
