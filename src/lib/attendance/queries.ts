import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { attendance, lessons } from "@/db/schema";

/**
 * Занятия группы вместе со всеми отметками — сырьё для сводной таблицы.
 * Отменённые занятия не считаются: пропуск отменённого занятия не вина
 * ученика и не должен портить ему процент.
 */
export async function listGroupAttendance(groupId: string) {
  return db
    .select({
      lessonId: lessons.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      studentId: attendance.studentId,
      status: attendance.status,
    })
    .from(lessons)
    .leftJoin(attendance, eq(attendance.lessonId, lessons.id))
    .where(and(eq(lessons.groupId, groupId), ne(lessons.status, "cancelled")))
    .orderBy(asc(lessons.startsAt));
}
