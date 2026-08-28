/**
 * Чистая логика тестов: состояние попытки, остаток времени, проверка
 * ответов. Без обращений к базе — используется и на сервере, и в клиенте,
 * и в юнит-тестах.
 */

export type QuestionType = "single" | "multiple" | "text";

export type AttemptLike = {
  startedAt: Date;
  expiresAt: Date | null;
  submittedAt: Date | null;
};

export type AttemptState =
  | "not_started" // попытки ещё нет
  | "in_progress" // идёт, время есть — можно продолжать
  | "expired" // время вышло, но не сдана — подлежит автосдаче
  | "submitted"; // завершена

/** Небольшой запас: клиентский таймер и серверные часы могут разойтись. */
const GRACE_MS = 5000;

export function attemptState(
  attempt: AttemptLike | null,
  now: Date = new Date(),
): AttemptState {
  if (!attempt) return "not_started";
  if (attempt.submittedAt) return "submitted";
  if (attempt.expiresAt && now.getTime() > attempt.expiresAt.getTime() + GRACE_MS) {
    return "expired";
  }
  return "in_progress";
}

/** Сколько миллисекунд осталось. null — тест без лимита. */
export function remainingMs(
  attempt: AttemptLike,
  now: Date = new Date(),
): number | null {
  if (!attempt.expiresAt) return null;
  return Math.max(0, attempt.expiresAt.getTime() - now.getTime());
}

/** Момент окончания попытки: старт + лимит, либо null без лимита. */
export function computeExpiry(
  startedAt: Date,
  timeLimitMin: number | null,
): Date | null {
  if (!timeLimitMin || timeLimitMin <= 0) return null;
  return new Date(startedAt.getTime() + timeLimitMin * 60_000);
}

/** Можно ли сейчас начать попытку по окну доступности теста. */
export function withinWindow(
  test: { opensAt: Date | null; closesAt: Date | null },
  now: Date = new Date(),
): boolean {
  if (test.opensAt && now < test.opensAt) return false;
  if (test.closesAt && now > test.closesAt) return false;
  return true;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/* ---------------------------------------------------------------- проверка */

export type GradableQuestion = {
  id: string;
  type: QuestionType;
  points: number;
  /** id вариантов, помеченных верными. Для text — пусто. */
  correctOptionIds: string[];
};

export type GivenAnswer = {
  optionIds: string[];
  text: string | null;
};

export type GradeResult = {
  /** null — вопрос со свободным ответом, нужна ручная проверка. */
  isCorrect: boolean | null;
  awardedPoints: number;
  needsReview: boolean;
};

/**
 * Проверяет один ответ.
 *
 * - single: верно, если выбран ровно один вариант и он правильный;
 * - multiple: верно, только если выбраны все верные и ни одного лишнего
 *   (частичный балл не начисляем — так однозначнее);
 * - text: автоматически не проверяется, балл 0 до ручной оценки.
 */
export function gradeAnswer(
  question: GradableQuestion,
  answer: GivenAnswer | undefined,
): GradeResult {
  if (question.type === "text") {
    return { isCorrect: null, awardedPoints: 0, needsReview: true };
  }

  const chosen = new Set(answer?.optionIds ?? []);
  const correct = new Set(question.correctOptionIds);

  if (question.type === "single") {
    const ok = chosen.size === 1 && [...chosen][0] !== undefined &&
      correct.has([...chosen][0]);
    return {
      isCorrect: ok,
      awardedPoints: ok ? question.points : 0,
      needsReview: false,
    };
  }

  // multiple
  const exact =
    chosen.size === correct.size &&
    [...correct].every((id) => chosen.has(id)) &&
    [...chosen].every((id) => correct.has(id));

  return {
    isCorrect: exact,
    awardedPoints: exact ? question.points : 0,
    needsReview: false,
  };
}

/** Итог по попытке: сумма автопроверяемых баллов и флаг ручной проверки. */
export function gradeAttempt(
  questions: GradableQuestion[],
  answers: Map<string, GivenAnswer>,
) {
  let autoScore = 0;
  let needsReview = false;
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const perQuestion = new Map<string, GradeResult>();

  for (const question of questions) {
    const result = gradeAnswer(question, answers.get(question.id));
    perQuestion.set(question.id, result);
    autoScore += result.awardedPoints;
    if (result.needsReview) needsReview = true;
  }

  return { autoScore, maxScore, needsReview, perQuestion };
}
