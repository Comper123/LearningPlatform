"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { students, topicProgress } from "@/db/schema";
import { requireTeacher } from "@/lib/session";

/** Ставит уровень освоения темы (0–5) ученику преподавателя. */
export async function setTopicLevel(formData: FormData) {
  const teacher = await requireTeacher();
  const studentId = String(formData.get("studentId") ?? "");
  const topicId = String(formData.get("topicId") ?? "");
  const level = Number(formData.get("level"));

  if (!studentId || !topicId) return;
  if (!Number.isInteger(level) || level < 0 || level > 5) return;

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.teacherId, teacher.id)))
    .limit(1);

  if (!student) return;

  await db
    .insert(topicProgress)
    .values({ studentId, topicId, level })
    .onConflictDoUpdate({
      target: [topicProgress.studentId, topicProgress.topicId],
      set: { level: sql`excluded.level`, updatedAt: new Date() },
    });

  revalidatePath(`/students/${studentId}`);
}
