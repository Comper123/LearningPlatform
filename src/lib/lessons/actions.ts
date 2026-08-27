"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { attendance, groups, lessonFiles, lessons } from "@/db/schema";
import { firstIssue, optionalText, type FormState } from "@/lib/form";
import { assertOwnGroup } from "@/lib/groups/actions";
import { requireTeacher } from "@/lib/session";
import {
  lessonPrefix,
  removeFile,
  storageEnabled,
  uploadFile,
} from "@/lib/storage";

const lessonSchema = z.object({
  groupId: z.string().uuid("Выберите группу"),
  title: z.string().trim().min(2, "Укажите тему занятия"),
  startsAt: z.string().trim().min(1, "Укажите дату и время"),
  durationMin: z.coerce.number().int().min(15).max(600),
  topicId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

export async function createLesson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = lessonSchema.safeParse({
    groupId: formData.get("groupId") ?? "",
    title: formData.get("title") ?? "",
    startsAt: formData.get("startsAt") ?? "",
    durationMin: formData.get("durationMin") ?? 90,
    topicId: formData.get("topicId") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { startsAt, ...rest } = parsed.data;
  if (!(await assertOwnGroup(teacher.id, rest.groupId))) {
    return { error: "Группа не найдена" };
  }

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return { error: "Некорректная дата" };

  await db.insert(lessons).values({ ...rest, startsAt: date });

  revalidatePath("/lessons");
  revalidatePath(`/groups/${rest.groupId}`);
  return {};
}

/** Проверяет, что занятие принадлежит группе преподавателя. */
async function ownedLesson(teacherId: string, lessonId: string) {
  const [lesson] = await db
    .select({ id: lessons.id, groupId: lessons.groupId })
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(and(eq(lessons.id, lessonId), eq(groups.teacherId, teacherId)))
    .limit(1);

  return lesson ?? null;
}

const lessonUpdateSchema = z.object({
  status: z.enum(["planned", "done", "cancelled"]),
  summary: optionalText,
  content: optionalText,
});

export async function updateLesson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const lessonId = String(formData.get("lessonId") ?? "");
  const parsed = lessonUpdateSchema.safeParse({
    status: formData.get("status") ?? "planned",
    summary: formData.get("summary") ?? "",
    content: formData.get("content") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const lesson = await ownedLesson(teacher.id, lessonId);
  if (!lesson) return { error: "Занятие не найдено" };

  await db.update(lessons).set(parsed.data).where(eq(lessons.id, lessonId));

  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath("/lessons");
  return {};
}

/* ------------------------------------------------- материалы занятия */

/** Прикрепляет файл к занятию: презентация, PDF, пример кода, датасет. */
export async function uploadLessonFile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const lessonId = String(formData.get("lessonId") ?? "");

  const lesson = await ownedLesson(teacher.id, lessonId);
  if (!lesson) return { error: "Занятие не найдено" };

  if (!storageEnabled) {
    return { error: "Хранилище не настроено — смотрите README" };
  }

  const upload = formData.get("file");
  if (!(upload instanceof File) || upload.size === 0) {
    return { error: "Выберите файл" };
  }

  try {
    const saved = await uploadFile(lessonPrefix(lessonId), upload);

    await db.insert(lessonFiles).values({
      lessonId,
      path: saved.path,
      name: saved.name,
      size: saved.size,
      mimeType: saved.mimeType,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Не удалось загрузить файл",
    };
  }

  revalidatePath(`/lessons/${lessonId}`);
  return {};
}

/** Убирает материал и из базы, и из хранилища — мусор не копим. */
export async function deleteLessonFile(formData: FormData) {
  const teacher = await requireTeacher();
  const lessonId = String(formData.get("lessonId") ?? "");
  const fileId = String(formData.get("fileId") ?? "");

  if (!lessonId || !fileId) return;
  if (!(await ownedLesson(teacher.id, lessonId))) return;

  const [removed] = await db
    .delete(lessonFiles)
    .where(and(eq(lessonFiles.id, fileId), eq(lessonFiles.lessonId, lessonId)))
    .returning({ path: lessonFiles.path });

  if (removed) await removeFile(removed.path);

  revalidatePath(`/lessons/${lessonId}`);
}

const attendanceValues = ["present", "absent", "late", "excused"] as const;

/**
 * Сохраняет отметки всей группы разом: форма присылает
 * пары `status:<studentId>` для каждого ученика.
 */
export async function saveAttendance(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const lessonId = String(formData.get("lessonId") ?? "");

  const lesson = await ownedLesson(teacher.id, lessonId);
  if (!lesson) return { error: "Занятие не найдено" };

  const rows = [...formData.entries()]
    .filter(([key]) => key.startsWith("status:"))
    .map(([key, value]) => ({
      lessonId,
      studentId: key.slice("status:".length),
      status: String(value) as (typeof attendanceValues)[number],
    }))
    .filter((row) => attendanceValues.includes(row.status));

  if (rows.length === 0) return { error: "Некого отмечать" };

  await db
    .insert(attendance)
    .values(rows)
    .onConflictDoUpdate({
      target: [attendance.lessonId, attendance.studentId],
      // excluded.status — значение из строки, которую пытались вставить.
      set: { status: sql`excluded.status` },
    });

  // Отметили посещаемость — занятие считается проведённым.
  await db
    .update(lessons)
    .set({ status: "done" })
    .where(and(eq(lessons.id, lessonId), eq(lessons.status, "planned")));

  revalidatePath(`/lessons/${lessonId}`);
  return {};
}
