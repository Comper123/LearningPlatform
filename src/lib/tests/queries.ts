import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  groups,
  students,
  testAnswers,
  testAttempts,
  testGroups,
  testOptions,
  testQuestions,
  tests,
  topics,
} from "@/db/schema";

export async function listTests(teacherId: string) {
  const rows = await db
    .select({
      id: tests.id,
      title: tests.title,
      status: tests.status,
      timeLimitMin: tests.timeLimitMin,
      opensAt: tests.opensAt,
      closesAt: tests.closesAt,
      questionCount: count(testQuestions.id),
    })
    .from(tests)
    .leftJoin(testQuestions, eq(testQuestions.testId, tests.id))
    .where(eq(tests.teacherId, teacherId))
    .groupBy(tests.id)
    .orderBy(desc(tests.createdAt));

  return rows;
}

export async function getTest(teacherId: string, testId: string) {
  const [test] = await db
    .select({
      id: tests.id,
      title: tests.title,
      description: tests.description,
      timeLimitMin: tests.timeLimitMin,
      opensAt: tests.opensAt,
      closesAt: tests.closesAt,
      revealAnswers: tests.revealAnswers,
      status: tests.status,
      topicId: tests.topicId,
      topicTitle: topics.title,
    })
    .from(tests)
    .leftJoin(topics, eq(topics.id, tests.topicId))
    .where(and(eq(tests.id, testId), eq(tests.teacherId, teacherId)))
    .limit(1);

  return test ?? null;
}

/** Вопросы теста вместе с вариантами. */
export async function listQuestions(testId: string) {
  const questions = await db
    .select()
    .from(testQuestions)
    .where(eq(testQuestions.testId, testId))
    .orderBy(asc(testQuestions.position), asc(testQuestions.id));

  if (questions.length === 0) return [];

  const options = await db
    .select()
    .from(testOptions)
    .where(
      inArray(
        testOptions.questionId,
        questions.map((q) => q.id),
      ),
    )
    .orderBy(asc(testOptions.position), asc(testOptions.id));

  return questions.map((question) => ({
    ...question,
    options: options.filter((o) => o.questionId === question.id),
  }));
}

/** id групп, которым назначен тест. */
export async function listTestGroupIds(testId: string) {
  const rows = await db
    .select({ groupId: testGroups.groupId })
    .from(testGroups)
    .where(eq(testGroups.testId, testId));

  return rows.map((r) => r.groupId);
}

/** Результаты: попытки учеников по этому тесту. */
export async function listTestResults(testId: string) {
  return db
    .select({
      attemptId: testAttempts.id,
      studentId: testAttempts.studentId,
      fullName: students.fullName,
      startedAt: testAttempts.startedAt,
      expiresAt: testAttempts.expiresAt,
      submittedAt: testAttempts.submittedAt,
      autoSubmitted: testAttempts.autoSubmitted,
      autoScore: testAttempts.autoScore,
      score: testAttempts.score,
      maxScore: testAttempts.maxScore,
    })
    .from(testAttempts)
    .innerJoin(students, eq(students.id, testAttempts.studentId))
    .where(eq(testAttempts.testId, testId))
    .orderBy(desc(testAttempts.startedAt));
}

/** Одна попытка с ответами — для ручной проверки свободных ответов. */
export async function getAttemptForReview(teacherId: string, attemptId: string) {
  const [attempt] = await db
    .select({
      id: testAttempts.id,
      testId: testAttempts.testId,
      studentName: students.fullName,
      autoScore: testAttempts.autoScore,
      maxScore: testAttempts.maxScore,
      score: testAttempts.score,
    })
    .from(testAttempts)
    .innerJoin(students, eq(students.id, testAttempts.studentId))
    .innerJoin(tests, eq(tests.id, testAttempts.testId))
    .where(and(eq(testAttempts.id, attemptId), eq(tests.teacherId, teacherId)))
    .limit(1);

  if (!attempt) return null;

  const questions = await db
    .select()
    .from(testQuestions)
    .where(eq(testQuestions.testId, attempt.testId))
    .orderBy(asc(testQuestions.position));

  const answers = await db
    .select()
    .from(testAnswers)
    .where(eq(testAnswers.attemptId, attemptId));

  return {
    attempt,
    // Ручной проверки требуют только свободные ответы.
    items: questions
      .filter((q) => q.type === "text")
      .map((q) => ({
        question: q,
        answer: answers.find((a) => a.questionId === q.id) ?? null,
      })),
  };
}

export async function countTestAttempts(testId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(testAttempts)
    .where(eq(testAttempts.testId, testId));
  return Number(n);
}

/**
 * Аналитика теста: сводка по попыткам и разбор по вопросам —
 * где ученики чаще ошибаются.
 */
export async function getTestAnalytics(teacherId: string, testId: string) {
  const test = await getTest(teacherId, testId);
  if (!test) return null;

  const attempts = await db
    .select({
      submittedAt: testAttempts.submittedAt,
      autoSubmitted: testAttempts.autoSubmitted,
      score: testAttempts.score,
      autoScore: testAttempts.autoScore,
      maxScore: testAttempts.maxScore,
      startedAt: testAttempts.startedAt,
      expiresAt: testAttempts.expiresAt,
    })
    .from(testAttempts)
    .where(eq(testAttempts.testId, testId));

  const finished = attempts.filter((a) => a.submittedAt);
  const scored = finished.filter((a) => a.score !== null);

  const maxScore = attempts[0]?.maxScore ?? 0;
  const avgPercent =
    scored.length && maxScore
      ? Math.round(
          (scored.reduce((s, a) => s + (a.score ?? 0), 0) /
            (scored.length * maxScore)) *
            100,
        )
      : null;

  // Средняя продолжительность завершённой попытки, в минутах.
  const durations = finished
    .filter((a) => a.submittedAt)
    .map(
      (a) =>
        (a.submittedAt!.getTime() - a.startedAt.getTime()) / 60_000,
    );
  const avgMinutes = durations.length
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : null;

  // По каждому вопросу: сколько ответили и сколько верно.
  const questions = await db
    .select({
      id: testQuestions.id,
      prompt: testQuestions.prompt,
      type: testQuestions.type,
      points: testQuestions.points,
      position: testQuestions.position,
    })
    .from(testQuestions)
    .where(eq(testQuestions.testId, testId))
    .orderBy(asc(testQuestions.position));

  const perQuestion = questions.length
    ? await db
        .select({
          questionId: testAnswers.questionId,
          answered: sql<number>`count(*) filter (where ${testAnswers.optionIds} <> '[]'::jsonb or ${testAnswers.text} is not null)`,
          correct: sql<number>`count(*) filter (where ${testAnswers.isCorrect} = true)`,
          total: count(),
        })
        .from(testAnswers)
        .innerJoin(
          testAttempts,
          eq(testAttempts.id, testAnswers.attemptId),
        )
        .where(
          and(
            eq(testAttempts.testId, testId),
            inArray(
              testAnswers.questionId,
              questions.map((q) => q.id),
            ),
          ),
        )
        .groupBy(testAnswers.questionId)
    : [];

  const statByQuestion = new Map(perQuestion.map((r) => [r.questionId, r]));

  return {
    test,
    totals: {
      attempts: attempts.length,
      finished: finished.length,
      inProgress: attempts.length - finished.length,
      autoSubmitted: finished.filter((a) => a.autoSubmitted).length,
      pendingReview: finished.length - scored.length,
      avgPercent,
      avgMinutes,
      maxScore,
    },
    questions: questions.map((q) => {
      const s = statByQuestion.get(q.id);
      const answered = Number(s?.answered ?? 0);
      const correct = Number(s?.correct ?? 0);
      return {
        ...q,
        answered,
        correct,
        correctRate: answered ? Math.round((correct / answered) * 100) : null,
      };
    }),
  };
}

/** Тесты преподавателя для выпадающих списков. */
export async function testGroupOptions(teacherId: string) {
  return db
    .select({ id: groups.id, title: groups.title })
    .from(groups)
    .where(eq(groups.teacherId, teacherId))
    .orderBy(asc(groups.title));
}
