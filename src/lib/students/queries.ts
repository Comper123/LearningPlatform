import { and, asc, desc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { enrollments, groups, students } from "@/db/schema";

const studentColumns = {
  id: students.id,
  fullName: students.fullName,
  email: students.email,
  phone: students.phone,
  telegram: students.telegram,
  status: students.status,
  notes: students.notes,
  userId: students.userId,
  createdAt: students.createdAt,
};

/** Список учеников без необработанных заявок — те живут отдельным блоком. */
export async function listStudents(teacherId: string) {
  return db
    .select(studentColumns)
    .from(students)
    .where(
      and(eq(students.teacherId, teacherId), ne(students.status, "pending")),
    )
    .orderBy(asc(students.fullName));
}

/** Заявки на зачисление: кто записался по коду и ждёт решения. */
export async function listPendingRequests(teacherId: string) {
  return db
    .select(studentColumns)
    .from(students)
    .where(
      and(eq(students.teacherId, teacherId), eq(students.status, "pending")),
    )
    .orderBy(desc(students.createdAt));
}

export async function getStudent(teacherId: string, studentId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.teacherId, teacherId), eq(students.id, studentId)))
    .limit(1);

  return student ?? null;
}

export async function listStudentGroups(studentId: string) {
  return db
    .select({ id: groups.id, title: groups.title, status: groups.status })
    .from(enrollments)
    .innerJoin(groups, eq(groups.id, enrollments.groupId))
    .where(eq(enrollments.studentId, studentId))
    .orderBy(asc(groups.title));
}
