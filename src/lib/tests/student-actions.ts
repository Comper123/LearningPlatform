"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { testAnswers, testAttempts, testQuestions, tests } from "@/db/schema";
import type { FormState } from "@/lib/form";
import { finalizeAttempt } from "@/lib/tests/grading";
import { attemptState, computeExpiry, withinWindow } from "@/lib/tests/logic";
import { getAttempt, getStudentTest } from "@/lib/tests/student";
import { requireStudent } from "@/lib/session";

/**
 * Начинает попытку. `expiresAt` фиксируется здесь — дальше время идёт
 * от него, и вернуться к тесту можно, пока оно не вышло.
 */
export async function startAttempt(formData: FormData) {
  const { student } = await requireStudent();
  const testId = String(formData.get("testId") ?? "");

  const test = await getStudentTest(student.id, testId);
  if (!test) return;

  if (!withinWindow(test)) return;

  const existing = await getAttempt(student.id, testId);
  if (existing) {
    // Уже начата — просто возвращаемся к ней.
    redirect(`/me/tests/${testId}`);
  }

  const startedAt = new Date();

  await db
    .insert(testAttempts)
    .values({
      testId,
      studentId: student.id,
      startedAt,
      expiresAt: computeExpiry(startedAt, test.timeLimitMin),
    })
    .onConflictDoNothing();

  redirect(`/me/tests/${testId}`);
}

/**
 * Сохраняет ответ на один вопрос. Вызывается по ходу прохождения, поэтому
 * при возврате ученик видит уже отмеченное. Отклоняется, если время вышло
 * или попытка сдана.
 */
export async function saveAnswer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { student } = await requireStudent();
  const testId = String(formData.get("testId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  const attempt = await getAttempt(student.id, testId);
  if (!attempt) return { error: "Попытка не найдена" };

  const state = attemptState(attempt);
  if (state !== "in_progress") {
    return { error: "Время вышло — ответы больше не сохраняются" };
  }

  // Вопрос должен принадлежать этому тесту.
  const [question] = await db
    .select({ id: testQuestions.id, type: testQuestions.type })
    .from(testQuestions)
    .where(
      and(eq(testQuestions.id, questionId), eq(testQuestions.testId, testId)),
    )
    .limit(1);
  if (!question) return { error: "Вопрос не найден" };

  const optionIds = formData.getAll("optionId").map(String).filter(Boolean);
  const text = String(formData.get("text") ?? "").trim() || null;

  await db
    .insert(testAnswers)
    .values({
      attemptId: attempt.id,
      questionId,
      optionIds: question.type === "text" ? [] : optionIds,
      text: question.type === "text" ? text : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [testAnswers.attemptId, testAnswers.questionId],
      set: {
        optionIds: question.type === "text" ? [] : optionIds,
        text: question.type === "text" ? text : null,
        updatedAt: new Date(),
      },
    });

  revalidatePath(`/me/tests/${testId}`);
  return {};
}

/** Ученик завершает тест сам. */
export async function submitAttempt(formData: FormData) {
  const { student } = await requireStudent();
  const testId = String(formData.get("testId") ?? "");

  const attempt = await getAttempt(student.id, testId);
  if (!attempt || attempt.submittedAt) redirect(`/me/tests/${testId}`);

  await finalizeAttempt(attempt.id, false);
  redirect(`/me/tests/${testId}`);
}

/**
 * Тихо доводит просроченную попытку до сдачи. Вызывается со страницы
 * теста, когда та обнаруживает, что время уже вышло, а попытка открыта.
 */
export async function autoSubmitExpired(testId: string) {
  const { student } = await requireStudent();

  const attempt = await getAttempt(student.id, testId);
  if (!attempt || attempt.submittedAt) return;
  if (attemptState(attempt) !== "expired") return;

  await finalizeAttempt(attempt.id, true);
  revalidatePath(`/me/tests/${testId}`);
}
