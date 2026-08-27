import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  attendance,
  enrollments,
  groups,
  lessonFiles,
  lessons,
  students,
  topics,
} from "@/db/schema";

export async function listLessons(teacherId: string) {
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      status: lessons.status,
      groupId: groups.id,
      groupTitle: groups.title,
    })
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(eq(groups.teacherId, teacherId))
    .orderBy(desc(lessons.startsAt));
}

export async function listGroupLessons(groupId: string) {
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      status: lessons.status,
    })
    .from(lessons)
    .where(eq(lessons.groupId, groupId))
    .orderBy(desc(lessons.startsAt));
}

export async function getLesson(teacherId: string, lessonId: string) {
  const [lesson] = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      durationMin: lessons.durationMin,
      status: lessons.status,
      summary: lessons.summary,
      content: lessons.content,
      groupId: groups.id,
      groupTitle: groups.title,
      courseId: groups.courseId,
      topicId: lessons.topicId,
      topicTitle: topics.title,
    })
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .leftJoin(topics, eq(topics.id, lessons.topicId))
    .where(and(eq(lessons.id, lessonId), eq(groups.teacherId, teacherId)))
    .limit(1);

  return lesson ?? null;
}

/**
 * Состав группы вместе с уже проставленными отметками за это занятие.
 * Ученик без отметки приходит с attendanceStatus = null.
 */
export async function listLessonAttendance(groupId: string, lessonId: string) {
  return db
    .select({
      studentId: students.id,
      fullName: students.fullName,
      attendanceStatus: attendance.status,
      note: attendance.note,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .leftJoin(
      attendance,
      and(
        eq(attendance.studentId, students.id),
        eq(attendance.lessonId, lessonId),
      ),
    )
    .where(and(eq(enrollments.groupId, groupId), isNull(enrollments.leftAt)))
    .orderBy(asc(students.fullName));
}

/** Материалы, прикреплённые к занятию. */
export async function listLessonFiles(lessonId: string) {
  return db
    .select()
    .from(lessonFiles)
    .where(eq(lessonFiles.lessonId, lessonId))
    .orderBy(asc(lessonFiles.uploadedAt));
}

/** Посещаемость конкретного ученика по всем его занятиям. */
export async function listStudentAttendance(studentId: string) {
  return db
    .select({
      lessonId: lessons.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      groupTitle: groups.title,
      status: attendance.status,
    })
    .from(attendance)
    .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .where(eq(attendance.studentId, studentId))
    .orderBy(desc(lessons.startsAt));
}
