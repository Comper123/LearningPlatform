"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { students, teacherProfiles, users } from "@/db/schema";
import { firstIssue, optionalText, type FormState } from "@/lib/form";
import { ensureTeacherProfile } from "@/lib/registration";
import { requireStudent, requireTeacher } from "@/lib/session";

const teacherSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя"),
  headline: optionalText,
  bio: optionalText,
});

export async function updateTeacherProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = teacherSchema.safeParse({
    name: formData.get("name") ?? "",
    headline: formData.get("headline") ?? "",
    bio: formData.get("bio") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await ensureTeacherProfile(teacher.id);

  await db
    .update(users)
    .set({ name: parsed.data.name })
    .where(eq(users.id, teacher.id));

  await db
    .update(teacherProfiles)
    .set({ headline: parsed.data.headline, bio: parsed.data.bio })
    .where(eq(teacherProfiles.userId, teacher.id));

  revalidatePath("/settings");
  return {};
}

const studentSchema = z.object({
  fullName: z.string().trim().min(2, "Укажите имя и фамилию"),
  phone: optionalText,
  telegram: optionalText,
});

export async function updateStudentProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { student } = await requireStudent();
  const parsed = studentSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    telegram: formData.get("telegram") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await db
    .update(students)
    .set(parsed.data)
    .where(eq(students.id, student.id));

  revalidatePath("/me/profile");
  return {};
}
