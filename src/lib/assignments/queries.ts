import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  assignments,
  enrollments,
  groups,
  students,
  submissions,
  topics,
} from "@/db/schema";

export async function listAssignments(teacherId: string) {
  return db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueAt: assignments.dueAt,
      maxScore: assignments.maxScore,
      groupTitle: groups.title,
      total: count(submissions.studentId),
      // Сколько работ ждёт проверки — главный сигнал для преподавателя.
      pending: sql<number>`count(*) filter (where ${submissions.status} = 'submitted')`,
    })
    .from(assignments)
    .leftJoin(groups, eq(groups.id, assignments.groupId))
    .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
    .where(eq(assignments.teacherId, teacherId))
    .groupBy(assignments.id, groups.title)
    .orderBy(desc(assignments.createdAt));
}

export async function getAssignment(teacherId: string, assignmentId: string) {
  const [assignment] = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueAt: assignments.dueAt,
      maxScore: assignments.maxScore,
      groupId: assignments.groupId,
      groupTitle: groups.title,
      topicTitle: topics.title,
    })
    .from(assignments)
    .leftJoin(groups, eq(groups.id, assignments.groupId))
    .leftJoin(topics, eq(topics.id, assignments.topicId))
    .where(
      and(eq(assignments.id, assignmentId), eq(assignments.teacherId, teacherId)),
    )
    .limit(1);

  return assignment ?? null;
}

/** Сдачи по заданию вместе с именами учеников. */
export async function listSubmissions(assignmentId: string) {
  return db
    .select({
      studentId: students.id,
      fullName: students.fullName,
      status: submissions.status,
      url: submissions.url,
      codeText: submissions.codeText,
      codeLang: submissions.codeLang,
      filePath: submissions.filePath,
      fileName: submissions.fileName,
      score: submissions.score,
      feedback: submissions.feedback,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .innerJoin(students, eq(students.id, submissions.studentId))
    .where(eq(submissions.assignmentId, assignmentId))
    .orderBy(asc(students.fullName));
}

/** Задания конкретного ученика — для его кабинета и карточки. */
export async function listStudentAssignments(studentId: string) {
  return db
    .select({
      assignmentId: assignments.id,
      title: assignments.title,
      dueAt: assignments.dueAt,
      maxScore: assignments.maxScore,
      status: submissions.status,
      url: submissions.url,
      codeText: submissions.codeText,
      codeLang: submissions.codeLang,
      fileName: submissions.fileName,
      score: submissions.score,
      feedback: submissions.feedback,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .where(eq(submissions.studentId, studentId))
    .orderBy(desc(assignments.createdAt));
}

/** Действующий состав группы — кому выдавать задание. */
export async function groupMemberIds(groupId: string) {
  const rows = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(and(eq(enrollments.groupId, groupId), isNull(enrollments.leftAt)));

  return rows.map((r) => r.studentId);
}
