"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { assignments, submissions } from "@/db/schema";
import { groupMemberIds } from "@/lib/assignments/queries";
import { firstIssue, optionalText, type FormState } from "@/lib/form";
import { assertOwnGroup } from "@/lib/groups/actions";
import { findStudentByUser } from "@/lib/registration";
import { requireTeacher, requireUser } from "@/lib/session";
import { storageEnabled, submissionPrefix, uploadFile } from "@/lib/storage";

const assignmentSchema = z.object({
  groupId: z.string().uuid("Выберите группу"),
  title: z.string().trim().min(2, "Укажите название задания"),
  description: optionalText,
  topicId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  dueAt: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  maxScore: z.coerce.number().int().min(1).max(1000),
});

export async function createAssignment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = assignmentSchema.safeParse({
    groupId: formData.get("groupId") ?? "",
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    topicId: formData.get("topicId") ?? "",
    dueAt: formData.get("dueAt") ?? "",
    maxScore: formData.get("maxScore") ?? 100,
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { dueAt, ...rest } = parsed.data;
  if (!(await assertOwnGroup(teacher.id, rest.groupId))) {
    return { error: "Группа не найдена" };
  }

  const members = await groupMemberIds(rest.groupId);
  if (members.length === 0) return { error: "В группе нет учеников" };

  // Задание сразу расходится по всему составу группы как «выдано».
  await db.transaction(async (tx) => {
    const [assignment] = await tx
      .insert(assignments)
      .values({
        ...rest,
        teacherId: teacher.id,
        dueAt: dueAt ? new Date(dueAt) : null,
      })
      .returning({ id: assignments.id });

    await tx.insert(submissions).values(
      members.map((studentId) => ({
        assignmentId: assignment.id,
        studentId,
      })),
    );
  });

  revalidatePath("/assignments");
  return {};
}

/** Проверяет, что задание принадлежит преподавателю. */
async function ownedAssignment(teacherId: string, assignmentId: string) {
  const [row] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(
      and(eq(assignments.id, assignmentId), eq(assignments.teacherId, teacherId)),
    )
    .limit(1);

  return !!row;
}

const reviewSchema = z.object({
  status: z.enum(["assigned", "submitted", "reviewed", "redo"]),
  score: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0), "Балл — целое число")
    .nullable(),
  feedback: optionalText,
});

export async function reviewSubmission(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  const parsed = reviewSchema.safeParse({
    status: formData.get("status") ?? "assigned",
    score: formData.get("score") ?? "",
    feedback: formData.get("feedback") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await ownedAssignment(teacher.id, assignmentId))) {
    return { error: "Задание не найдено" };
  }

  const { status, score, feedback } = parsed.data;

  await db
    .update(submissions)
    .set({
      status,
      score,
      feedback,
      reviewedAt: status === "reviewed" ? new Date() : null,
    })
    .where(
      and(
        eq(submissions.assignmentId, assignmentId),
        eq(submissions.studentId, studentId),
      ),
    );

  revalidatePath(`/assignments/${assignmentId}`);
  return {};
}

const submitSchema = z.object({
  url: z.union([
    z.string().trim().url("Нужна ссылка вида https://…"),
    z.literal(""),
  ]),
  codeText: optionalText,
  codeLang: z.string().trim().max(20).nullable(),
});

/**
 * Ученик сдаёт работу: ссылкой, вставленным кодом, файлом — или всем сразу.
 * Хотя бы что-то одно должно быть, иначе сдавать нечего.
 */
export async function submitWork(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const assignmentId = String(formData.get("assignmentId") ?? "");

  const student = await findStudentByUser(user.id);
  if (!student) return { error: "Карточка ученика не найдена" };

  const parsed = submitSchema.safeParse({
    url: formData.get("url") ?? "",
    codeText: formData.get("codeText") ?? "",
    codeLang: formData.get("codeLang") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { url, codeText, codeLang } = parsed.data;

  const upload = formData.get("file");
  const file = upload instanceof File && upload.size > 0 ? upload : null;

  if (!url && !codeText && !file) {
    return { error: "Приложите ссылку, код или файл" };
  }

  let filePath: string | null = null;
  let fileName: string | null = null;

  if (file) {
    if (!storageEnabled) {
      return { error: "Загрузка файлов не настроена — пришлите ссылку или код" };
    }

    try {
      const saved = await uploadFile(
        submissionPrefix(assignmentId, student.id),
        file,
      );
      filePath = saved.path;
      fileName = saved.name;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Не удалось загрузить файл",
      };
    }
  }

  const result = await db
    .update(submissions)
    .set({
      status: "submitted",
      url: url || null,
      codeText,
      codeLang: codeText ? codeLang || "text" : null,
      // Старый файл оставляем, если нового не прислали.
      ...(filePath ? { filePath, fileName } : {}),
      submittedAt: new Date(),
    })
    .where(
      and(
        eq(submissions.assignmentId, assignmentId),
        eq(submissions.studentId, student.id),
      ),
    )
    .returning({ assignmentId: submissions.assignmentId });

  if (result.length === 0) return { error: "Это задание вам не выдавали" };

  revalidatePath("/me/homework");
  return {};
}
