import "server-only";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  enrollments,
  testAnswers,
  testAttempts,
  testGroups,
  testOptions,
  testQuestions,
  tests,
} from "@/db/schema";
import { attemptState, computeExpiry, withinWindow } from "@/lib/tests/logic";

/** Тесты, доступные ученику: опубликованные и назначенные его группам. */
export async function listStudentTests(studentId: string) {
  const rows = await db
    .selectDistinct({
      id: tests.id,
      title: tests.title,
      description: tests.description,
      timeLimitMin: tests.timeLimitMin,
      opensAt: tests.opensAt,
      closesAt: tests.closesAt,
    })
    .from(tests)
    .innerJoin(testGroups, eq(testGroups.testId, tests.id))
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.groupId, testGroups.groupId),
        eq(enrollments.studentId, studentId),
        isNull(enrollments.leftAt),
      ),
    )
    .where(eq(tests.status, "published"))
    .orderBy(desc(tests.opensAt));

  if (rows.length === 0) return [];

  const attempts = await db
    .select()
    .from(testAttempts)
    .where(
      and(
        eq(testAttempts.studentId, studentId),
        inArray(
          testAttempts.testId,
          rows.map((r) => r.id),
        ),
      ),
    );

  const byTest = new Map(attempts.map((a) => [a.testId, a]));

  return rows.map((test) => {
    const attempt = byTest.get(test.id) ?? null;
    return {
      ...test,
      attempt,
      state: attemptState(attempt),
      canStart: withinWindow(test),
    };
  });
}

/** Доступен ли тест этому ученику (опубликован и назначен его группе). */
async function testAvailableTo(studentId: string, testId: string) {
  const [row] = await db
    .select({ id: tests.id })
    .from(tests)
    .innerJoin(testGroups, eq(testGroups.testId, tests.id))
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.groupId, testGroups.groupId),
        eq(enrollments.studentId, studentId),
        isNull(enrollments.leftAt),
      ),
    )
    .where(and(eq(tests.id, testId), eq(tests.status, "published")))
    .limit(1);

  return !!row;
}

export async function getStudentTest(studentId: string, testId: string) {
  if (!(await testAvailableTo(studentId, testId))) return null;

  const [test] = await db
    .select()
    .from(tests)
    .where(eq(tests.id, testId))
    .limit(1);

  return test ?? null;
}

export async function getAttempt(studentId: string, testId: string) {
  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(
      and(
        eq(testAttempts.testId, testId),
        eq(testAttempts.studentId, studentId),
      ),
    )
    .limit(1);

  return attempt ?? null;
}

/** Вопросы теста для прохождения. Верные варианты НЕ отдаём. */
export async function listQuestionsForTaking(testId: string) {
  const questions = await db
    .select({
      id: testQuestions.id,
      type: testQuestions.type,
      prompt: testQuestions.prompt,
      points: testQuestions.points,
      position: testQuestions.position,
    })
    .from(testQuestions)
    .where(eq(testQuestions.testId, testId))
    .orderBy(asc(testQuestions.position), asc(testQuestions.id));

  if (questions.length === 0) return [];

  const options = await db
    .select({
      id: testOptions.id,
      questionId: testOptions.questionId,
      text: testOptions.text,
      position: testOptions.position,
    })
    .from(testOptions)
    .where(
      inArray(
        testOptions.questionId,
        questions.map((q) => q.id),
      ),
    )
    .orderBy(asc(testOptions.position), asc(testOptions.id));

  return questions.map((q) => ({
    ...q,
    options: options.filter((o) => o.questionId === q.id),
  }));
}

export async function listAnswers(attemptId: string) {
  return db
    .select()
    .from(testAnswers)
    .where(eq(testAnswers.attemptId, attemptId));
}

/**
 * Разбор попытки для ученика: вопросы, его ответы, начисленные баллы.
 * Верные варианты включаются, только если тест это разрешает.
 */
export async function getAttemptReview(
  testId: string,
  attemptId: string,
  revealAnswers: boolean,
) {
  const questions = await db
    .select()
    .from(testQuestions)
    .where(eq(testQuestions.testId, testId))
    .orderBy(asc(testQuestions.position), asc(testQuestions.id));

  const questionIds = questions.map((q) => q.id);

  const options = questionIds.length
    ? await db
        .select()
        .from(testOptions)
        .where(inArray(testOptions.questionId, questionIds))
        .orderBy(asc(testOptions.position))
    : [];

  const answers = await db
    .select()
    .from(testAnswers)
    .where(eq(testAnswers.attemptId, attemptId));

  return questions.map((q) => {
    const answer = answers.find((a) => a.questionId === q.id) ?? null;
    return {
      question: q,
      options: options
        .filter((o) => o.questionId === q.id)
        .map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: revealAnswers ? o.isCorrect : null,
          chosen: (answer?.optionIds ?? []).includes(o.id),
        })),
      answer,
    };
  });
}

export { computeExpiry };
