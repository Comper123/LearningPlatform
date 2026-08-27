import { and, asc, count, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { courses, enrollments, groups, students } from "@/db/schema";

export async function listGroups(teacherId: string) {
  return db
    .select({
      id: groups.id,
      title: groups.title,
      status: groups.status,
      scheduleNote: groups.scheduleNote,
      courseTitle: courses.title,
      studentCount: count(enrollments.studentId),
    })
    .from(groups)
    .leftJoin(courses, eq(courses.id, groups.courseId))
    .leftJoin(
      enrollments,
      and(eq(enrollments.groupId, groups.id), isNull(enrollments.leftAt)),
    )
    .where(eq(groups.teacherId, teacherId))
    .groupBy(groups.id, courses.title)
    .orderBy(asc(groups.title));
}

export async function getGroup(teacherId: string, groupId: string) {
  const [group] = await db
    .select({
      id: groups.id,
      title: groups.title,
      status: groups.status,
      scheduleNote: groups.scheduleNote,
      startsOn: groups.startsOn,
      courseId: groups.courseId,
      courseTitle: courses.title,
    })
    .from(groups)
    .leftJoin(courses, eq(courses.id, groups.courseId))
    .where(and(eq(groups.teacherId, teacherId), eq(groups.id, groupId)))
    .limit(1);

  return group ?? null;
}

/** Действующий состав группы. */
export async function listGroupMembers(groupId: string) {
  return db
    .select({
      id: students.id,
      fullName: students.fullName,
      status: students.status,
      joinedAt: enrollments.joinedAt,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(and(eq(enrollments.groupId, groupId), isNull(enrollments.leftAt)))
    .orderBy(asc(students.fullName));
}

/** Ученики, которых ещё можно записать в группу. */
export async function listCandidates(teacherId: string, groupId: string) {
  const members = await db
    .select({ id: enrollments.studentId })
    .from(enrollments)
    .where(and(eq(enrollments.groupId, groupId), isNull(enrollments.leftAt)));

  const taken = new Set(members.map((m) => m.id));

  const all = await db
    .select({ id: students.id, fullName: students.fullName })
    .from(students)
    .where(and(eq(students.teacherId, teacherId), eq(students.status, "active")))
    .orderBy(asc(students.fullName));

  return all.filter((s) => !taken.has(s.id));
}

/** Группы для выпадающих списков в занятиях и заданиях. */
export async function groupOptions(teacherId: string) {
  return db
    .select({ id: groups.id, title: groups.title, courseId: groups.courseId })
    .from(groups)
    .where(eq(groups.teacherId, teacherId))
    .orderBy(asc(groups.title));
}
