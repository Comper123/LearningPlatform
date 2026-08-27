"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { enrollments, groups, students } from "@/db/schema";
import { firstIssue, optionalText, type FormState } from "@/lib/form";
import { requireTeacher } from "@/lib/session";

const groupSchema = z.object({
  title: z.string().trim().min(2, "Укажите название группы"),
  courseId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  scheduleNote: optionalText,
  startsOn: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  status: z.enum(["planned", "active", "finished"]),
});

export async function createGroup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = groupSchema.safeParse({
    title: formData.get("title") ?? "",
    courseId: formData.get("courseId") ?? "",
    scheduleNote: formData.get("scheduleNote") ?? "",
    startsOn: formData.get("startsOn") ?? "",
    status: formData.get("status") ?? "active",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await db.insert(groups).values({ ...parsed.data, teacherId: teacher.id });

  revalidatePath("/groups");
  return {};
}

/** Проверяет, что группа принадлежит преподавателю. */
export async function assertOwnGroup(teacherId: string, groupId: string) {
  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.teacherId, teacherId)))
    .limit(1);

  return !!group;
}

export async function addMember(formData: FormData) {
  const teacher = await requireTeacher();
  const groupId = String(formData.get("groupId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  if (!groupId || !studentId) return;
  if (!(await assertOwnGroup(teacher.id, groupId))) return;

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.teacherId, teacher.id)))
    .limit(1);

  if (!student) return;

  // Повторная запись после ухода: снимаем leftAt вместо вставки дубля.
  await db
    .insert(enrollments)
    .values({ groupId, studentId })
    .onConflictDoUpdate({
      target: [enrollments.groupId, enrollments.studentId],
      set: { leftAt: null, joinedAt: new Date() },
    });

  revalidatePath(`/groups/${groupId}`);
}

/** Отчисление сохраняет запись — история посещаемости остаётся связной. */
export async function removeMember(formData: FormData) {
  const teacher = await requireTeacher();
  const groupId = String(formData.get("groupId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  if (!groupId || !studentId) return;
  if (!(await assertOwnGroup(teacher.id, groupId))) return;

  await db
    .update(enrollments)
    .set({ leftAt: new Date() })
    .where(
      and(
        eq(enrollments.groupId, groupId),
        eq(enrollments.studentId, studentId),
        isNull(enrollments.leftAt),
      ),
    );

  revalidatePath(`/groups/${groupId}`);
}
