"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  testAttempts,
  testGroups,
  testOptions,
  testQuestions,
  tests,
} from "@/db/schema";
import { firstIssue, optionalText, type FormState } from "@/lib/form";
import { requireTeacher } from "@/lib/session";

/* --------------------------------------------------------------- владение */

async function ownsTest(teacherId: string, testId: string) {
  const [row] = await db
    .select({ id: tests.id })
    .from(tests)
    .where(and(eq(tests.id, testId), eq(tests.teacherId, teacherId)))
    .limit(1);
  return !!row;
}

/* ----------------------------------------------------------------- тест */

const dateField = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const testSchema = z.object({
  title: z.string().trim().min(2, "Укажите название теста"),
  description: optionalText,
  timeLimitMin: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 600), "Лимит 1–600 минут")
    .nullable(),
  opensAt: dateField,
  closesAt: dateField,
  revealAnswers: z.string().nullable(),
});

export async function createTest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = testSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    timeLimitMin: formData.get("timeLimitMin") ?? "",
    opensAt: formData.get("opensAt") ?? "",
    closesAt: formData.get("closesAt") ?? "",
    revealAnswers: formData.get("revealAnswers"),
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { opensAt, closesAt, revealAnswers, ...rest } = parsed.data;

  await db.insert(tests).values({
    ...rest,
    teacherId: teacher.id,
    opensAt: opensAt ? new Date(opensAt) : null,
    closesAt: closesAt ? new Date(closesAt) : null,
    revealAnswers: revealAnswers !== null,
  });

  revalidatePath("/tests");
  return {};
}

export async function updateTest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const testId = String(formData.get("testId") ?? "");
  if (!(await ownsTest(teacher.id, testId))) return { error: "Тест не найден" };

  const parsed = testSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    timeLimitMin: formData.get("timeLimitMin") ?? "",
    opensAt: formData.get("opensAt") ?? "",
    closesAt: formData.get("closesAt") ?? "",
    revealAnswers: formData.get("revealAnswers"),
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { opensAt, closesAt, revealAnswers, ...rest } = parsed.data;

  await db
    .update(tests)
    .set({
      ...rest,
      opensAt: opensAt ? new Date(opensAt) : null,
      closesAt: closesAt ? new Date(closesAt) : null,
      revealAnswers: revealAnswers !== null,
    })
    .where(eq(tests.id, testId));

  revalidatePath(`/tests/${testId}`);
  return {};
}

/** Публикация/снятие с публикации. Без вопросов публиковать нельзя. */
export async function toggleTestStatus(formData: FormData) {
  const teacher = await requireTeacher();
  const testId = String(formData.get("testId") ?? "");
  if (!(await ownsTest(teacher.id, testId))) return;

  const [test] = await db
    .select({ status: tests.status })
    .from(tests)
    .where(eq(tests.id, testId))
    .limit(1);
  if (!test) return;

  if (test.status === "draft") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)` })
      .from(testQuestions)
      .where(eq(testQuestions.testId, testId));

    if (Number(n) === 0) return;
  }

  await db
    .update(tests)
    .set({ status: test.status === "draft" ? "published" : "draft" })
    .where(eq(tests.id, testId));

  revalidatePath(`/tests/${testId}`);
  revalidatePath("/tests");
}

export async function deleteTest(formData: FormData) {
  const teacher = await requireTeacher();
  const testId = String(formData.get("testId") ?? "");
  if (!(await ownsTest(teacher.id, testId))) return;

  await db.delete(tests).where(eq(tests.id, testId));
  revalidatePath("/tests");
}

/* -------------------------------------------------------------- вопросы */

/**
 * Разбирает варианты из textarea: одна строка — один вариант, звёздочка
 * в начале помечает верный. Пустые строки игнорируются.
 */
function parseOptions(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const isCorrect = line.startsWith("*");
      const text = (isCorrect ? line.slice(1) : line).trim();
      return { text, isCorrect };
    })
    .filter((o) => o.text.length > 0);
}

type ParsedOption = { text: string; isCorrect: boolean };

/** Проверяет варианты по типу вопроса. Возвращает текст ошибки или null. */
function validateOptions(
  type: "single" | "multiple" | "text",
  options: ParsedOption[],
): string | null {
  if (type === "text") return null;
  if (options.length < 2) return "Нужно минимум два варианта";

  const correct = options.filter((o) => o.isCorrect).length;
  if (correct === 0) return "Отметьте верный вариант звёздочкой";
  if (type === "single" && correct > 1) {
    return "Для одиночного выбора верным может быть только один";
  }
  return null;
}

const questionSchema = z.object({
  testId: z.string().uuid(),
  type: z.enum(["single", "multiple", "text"]),
  prompt: z.string().trim().min(1, "Введите вопрос"),
  points: z.coerce.number().int().min(1).max(100),
  optionsRaw: z.string(),
});

export async function addQuestion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = questionSchema.safeParse({
    testId: formData.get("testId") ?? "",
    type: formData.get("type") ?? "single",
    prompt: formData.get("prompt") ?? "",
    points: formData.get("points") ?? 1,
    optionsRaw: formData.get("optionsRaw") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await ownsTest(teacher.id, parsed.data.testId))) {
    return { error: "Тест не найден" };
  }

  const { testId, type, prompt, points, optionsRaw } = parsed.data;
  const options = type === "text" ? [] : parseOptions(optionsRaw);

  const optionError = validateOptions(type, options);
  if (optionError) return { error: optionError };

  const [last] = await db
    .select({ max: sql<number>`coalesce(max(${testQuestions.position}), 0)` })
    .from(testQuestions)
    .where(eq(testQuestions.testId, testId));

  await db.transaction(async (tx) => {
    const [question] = await tx
      .insert(testQuestions)
      .values({ testId, type, prompt, points, position: Number(last.max) + 1 })
      .returning({ id: testQuestions.id });

    if (options.length > 0) {
      await tx.insert(testOptions).values(
        options.map((o, i) => ({
          questionId: question.id,
          text: o.text,
          isCorrect: o.isCorrect,
          position: i + 1,
        })),
      );
    }
  });

  revalidatePath(`/tests/${testId}`);
  return {};
}

const questionUpdateSchema = questionSchema.extend({
  questionId: z.string().uuid(),
});

/**
 * Меняет вопрос целиком: текст, тип, балл и варианты. Варианты
 * пересоздаются из textarea — так проще, чем сверять построчно.
 *
 * Если по этому тесту уже есть сдачи, менять его не даём: изменить
 * вопросы после того, как кто-то ответил, — значит испортить результаты.
 */
export async function updateQuestion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = questionUpdateSchema.safeParse({
    questionId: formData.get("questionId") ?? "",
    testId: formData.get("testId") ?? "",
    type: formData.get("type") ?? "single",
    prompt: formData.get("prompt") ?? "",
    points: formData.get("points") ?? 1,
    optionsRaw: formData.get("optionsRaw") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { questionId, testId, type, prompt, points, optionsRaw } = parsed.data;
  if (!(await ownsTest(teacher.id, testId))) return { error: "Тест не найден" };

  if (await testHasAttempts(testId)) {
    return { error: "Тест уже проходили — вопросы менять нельзя" };
  }

  const options = type === "text" ? [] : parseOptions(optionsRaw);
  const optionError = validateOptions(type, options);
  if (optionError) return { error: optionError };

  await db.transaction(async (tx) => {
    await tx
      .update(testQuestions)
      .set({ type, prompt, points })
      .where(
        and(eq(testQuestions.id, questionId), eq(testQuestions.testId, testId)),
      );

    await tx
      .delete(testOptions)
      .where(eq(testOptions.questionId, questionId));

    if (options.length > 0) {
      await tx.insert(testOptions).values(
        options.map((o, i) => ({
          questionId,
          text: o.text,
          isCorrect: o.isCorrect,
          position: i + 1,
        })),
      );
    }
  });

  revalidatePath(`/tests/${testId}`);
  return {};
}

async function testHasAttempts(testId: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(testAttempts)
    .where(eq(testAttempts.testId, testId));
  return Number(n) > 0;
}

export async function deleteQuestion(formData: FormData) {
  const teacher = await requireTeacher();
  const testId = String(formData.get("testId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  if (!testId || !questionId) return;
  if (!(await ownsTest(teacher.id, testId))) return;

  await db
    .delete(testQuestions)
    .where(
      and(eq(testQuestions.id, questionId), eq(testQuestions.testId, testId)),
    );

  revalidatePath(`/tests/${testId}`);
}

/* -------------------------------------------------------------- группы */

export async function setTestGroups(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const testId = String(formData.get("testId") ?? "");
  if (!(await ownsTest(teacher.id, testId))) return { error: "Тест не найден" };

  const groupIds = formData.getAll("groupId").map(String).filter(Boolean);

  await db.transaction(async (tx) => {
    await tx.delete(testGroups).where(eq(testGroups.testId, testId));
    if (groupIds.length > 0) {
      await tx
        .insert(testGroups)
        .values(groupIds.map((groupId) => ({ testId, groupId })));
    }
  });

  revalidatePath(`/tests/${testId}`);
  return {};
}

/* --------------------------------------------- ручная проверка ответов */

export async function gradeTextAnswer(formData: FormData) {
  const teacher = await requireTeacher();
  const testId = String(formData.get("testId") ?? "");
  const attemptId = String(formData.get("attemptId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const points = Number(formData.get("points"));

  if (!testId || !attemptId || !questionId) return;
  if (!Number.isInteger(points) || points < 0) return;
  if (!(await ownsTest(teacher.id, testId))) return;

  const { finalizeManualGrade } = await import("@/lib/tests/grading");
  await finalizeManualGrade(attemptId, questionId, points);

  revalidatePath(`/tests/${testId}/results`);
}
