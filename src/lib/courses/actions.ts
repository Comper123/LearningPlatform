"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { courses, topics } from "@/db/schema";
import { firstIssue, optionalText, type FormState } from "@/lib/form";
import { requireTeacher } from "@/lib/session";

const courseSchema = z.object({
  title: z.string().trim().min(2, "Укажите название курса"),
  level: optionalText,
  description: optionalText,
});

export async function createCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = courseSchema.safeParse({
    title: formData.get("title") ?? "",
    level: formData.get("level") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await db.insert(courses).values({ ...parsed.data, teacherId: teacher.id });

  revalidatePath("/courses");
  return {};
}

/** Проверяет, что курс принадлежит преподавателю. */
async function assertOwnCourse(teacherId: string, courseId: string) {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);

  return !!course;
}

const topicSchema = z.object({
  courseId: z.string().uuid("Курс не найден"),
  title: z.string().trim().min(2, "Укажите название темы"),
  description: optionalText,
});

export async function createTopic(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = topicSchema.safeParse({
    courseId: formData.get("courseId") ?? "",
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { courseId, ...rest } = parsed.data;
  if (!(await assertOwnCourse(teacher.id, courseId))) {
    return { error: "Курс не найден" };
  }

  // Новая тема встаёт в конец программы.
  const [last] = await db
    .select({ max: sql<number>`coalesce(max(${topics.position}), 0)` })
    .from(topics)
    .where(eq(topics.courseId, courseId));

  await db
    .insert(topics)
    .values({ ...rest, courseId, position: Number(last.max) + 1 });

  revalidatePath(`/courses/${courseId}`);
  return {};
}

export async function deleteTopic(formData: FormData) {
  const teacher = await requireTeacher();
  const topicId = String(formData.get("topicId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");

  if (!topicId || !courseId) return;
  if (!(await assertOwnCourse(teacher.id, courseId))) return;

  await db
    .delete(topics)
    .where(and(eq(topics.id, topicId), eq(topics.courseId, courseId)));

  revalidatePath(`/courses/${courseId}`);
}

/** Сдвигает тему на одну позицию вверх или вниз в программе курса. */
export async function moveTopic(formData: FormData) {
  const teacher = await requireTeacher();
  const topicId = String(formData.get("topicId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";

  if (!topicId || !courseId) return;
  if (!(await assertOwnCourse(teacher.id, courseId))) return;

  const ordered = await db
    .select({ id: topics.id })
    .from(topics)
    .where(eq(topics.courseId, courseId))
    .orderBy(topics.position, topics.title);

  const index = ordered.findIndex((t) => t.id === topicId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ordered.length) return;

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  // Позиции всегда перенумеровываются подряд — так порядок не «расползается».
  await db.transaction(async (tx) => {
    for (const [i, topic] of ordered.entries()) {
      await tx
        .update(topics)
        .set({ position: i + 1 })
        .where(eq(topics.id, topic.id));
    }
  });

  revalidatePath(`/courses/${courseId}`);
}
