import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  testAnswers,
  testAttempts,
  testOptions,
  testQuestions,
} from "@/db/schema";
import { gradeAttempt, type GivenAnswer, type GradableQuestion } from "@/lib/tests/logic";

/**
 * Финализирует попытку: проверяет автопроверяемые вопросы, проставляет
 * баллы в ответы и сумму в попытку. Свободные ответы остаются без баллов
 * до ручной оценки, поэтому `score` заполняется только когда проверять
 * больше нечего.
 */
export async function finalizeAttempt(attemptId: string, autoSubmitted: boolean) {
  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(eq(testAttempts.id, attemptId))
    .limit(1);

  if (!attempt || attempt.submittedAt) return;

  const questions = await db
    .select()
    .from(testQuestions)
    .where(eq(testQuestions.testId, attempt.testId));

  const options = questions.length
    ? await db
        .select()
        .from(testOptions)
        .where(
          inArray(
            testOptions.questionId,
            questions.map((q) => q.id),
          ),
        )
    : [];

  const gradable: GradableQuestion[] = questions.map((q) => ({
    id: q.id,
    type: q.type,
    points: q.points,
    correctOptionIds: options
      .filter((o) => o.questionId === q.id && o.isCorrect)
      .map((o) => o.id),
  }));

  const savedAnswers = await db
    .select()
    .from(testAnswers)
    .where(eq(testAnswers.attemptId, attemptId));

  const answerMap = new Map<string, GivenAnswer>(
    savedAnswers.map((a) => [
      a.questionId,
      { optionIds: a.optionIds ?? [], text: a.text },
    ]),
  );

  const { autoScore, maxScore, needsReview, perQuestion } = gradeAttempt(
    gradable,
    answerMap,
  );

  await db.transaction(async (tx) => {
    for (const [questionId, result] of perQuestion) {
      await tx
        .insert(testAnswers)
        .values({
          attemptId,
          questionId,
          isCorrect: result.isCorrect,
          awardedPoints: result.awardedPoints,
        })
        .onConflictDoUpdate({
          target: [testAnswers.attemptId, testAnswers.questionId],
          set: {
            isCorrect: result.isCorrect,
            awardedPoints: result.awardedPoints,
          },
        });
    }

    await tx
      .update(testAttempts)
      .set({
        submittedAt: new Date(),
        autoSubmitted,
        autoScore,
        maxScore,
        // Если ручная проверка не нужна — итог совпадает с автосуммой.
        score: needsReview ? null : autoScore,
      })
      .where(eq(testAttempts.id, attemptId));
  });
}

/** Преподаватель выставил балл за свободный ответ. */
export async function finalizeManualGrade(
  attemptId: string,
  questionId: string,
  points: number,
) {
  await db
    .update(testAnswers)
    .set({ awardedPoints: points, isCorrect: points > 0 })
    .where(
      and(
        eq(testAnswers.attemptId, attemptId),
        eq(testAnswers.questionId, questionId),
      ),
    );

  // Пересобираем итог: сумма всех выставленных баллов.
  const answers = await db
    .select({ awardedPoints: testAnswers.awardedPoints })
    .from(testAnswers)
    .where(eq(testAnswers.attemptId, attemptId));

  const allGraded = answers.every((a) => a.awardedPoints !== null);
  const total = answers.reduce((sum, a) => sum + (a.awardedPoints ?? 0), 0);

  await db
    .update(testAttempts)
    .set({ score: allGraded ? total : null })
    .where(eq(testAttempts.id, attemptId));
}
