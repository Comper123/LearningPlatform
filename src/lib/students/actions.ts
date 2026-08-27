"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { students } from "@/db/schema";
import { requireTeacher } from "@/lib/session";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const studentSchema = z.object({
  fullName: z.string().trim().min(2, "Укажите имя ученика"),
  email: z.union([z.string().trim().email("Некорректный email"), z.literal("")]),
  phone: optionalText,
  telegram: optionalText,
  status: z.enum(["active", "paused", "archived"]),
  notes: optionalText,
});

export type StudentFormState = { error?: string };

function parse(formData: FormData) {
  return studentSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    telegram: formData.get("telegram") ?? "",
    status: formData.get("status") ?? "active",
    notes: formData.get("notes") ?? "",
  });
}

export async function createStudent(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const teacher = await requireTeacher();
  const parsed = parse(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, ...rest } = parsed.data;

  await db.insert(students).values({
    ...rest,
    email: email || null,
    teacherId: teacher.id,
  });

  revalidatePath("/students");
  return {};
}

export async function updateStudent(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const teacher = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  const parsed = parse(formData);

  if (!id) return { error: "Не передан идентификатор ученика" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { email, ...rest } = parsed.data;

  await db
    .update(students)
    .set({ ...rest, email: email || null })
    .where(and(eq(students.id, id), eq(students.teacherId, teacher.id)));

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return {};
}

export async function archiveStudent(formData: FormData) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .update(students)
    .set({ status: "archived" })
    .where(and(eq(students.id, id), eq(students.teacherId, teacher.id)));

  revalidatePath("/students");
}

/**
 * Решение по заявке. Меняем статус только у своей заявки и только у той,
 * что ещё в статусе `pending` — повторный клик ничего не сломает.
 */
async function decideRequest(
  formData: FormData,
  status: "active" | "rejected",
) {
  const teacher = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .update(students)
    .set({ status })
    .where(
      and(
        eq(students.id, id),
        eq(students.teacherId, teacher.id),
        eq(students.status, "pending"),
      ),
    );

  revalidatePath("/students");
  revalidatePath("/dashboard");
}

export async function approveRequest(formData: FormData) {
  await decideRequest(formData, "active");
}

export async function rejectRequest(formData: FormData) {
  await decideRequest(formData, "rejected");
}
