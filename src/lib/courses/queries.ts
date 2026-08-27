import { and, asc, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { courses, groups, topics } from "@/db/schema";

export async function listCourses(teacherId: string) {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      level: courses.level,
      description: courses.description,
      topicCount: count(topics.id),
    })
    .from(courses)
    .leftJoin(topics, eq(topics.courseId, courses.id))
    .where(eq(courses.teacherId, teacherId))
    .groupBy(courses.id)
    .orderBy(asc(courses.title));
}

export async function getCourse(teacherId: string, courseId: string) {
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.teacherId, teacherId), eq(courses.id, courseId)))
    .limit(1);

  return course ?? null;
}

export async function listTopics(courseId: string) {
  return db
    .select()
    .from(topics)
    .where(eq(topics.courseId, courseId))
    .orderBy(asc(topics.position), asc(topics.title));
}

export async function listCourseGroups(courseId: string) {
  return db
    .select({ id: groups.id, title: groups.title, status: groups.status })
    .from(groups)
    .where(eq(groups.courseId, courseId))
    .orderBy(asc(groups.title));
}

/** Все темы преподавателя — для выбора темы занятия/задания на клиенте. */
export async function allTopics(teacherId: string) {
  return db
    .select({
      id: topics.id,
      title: topics.title,
      courseId: topics.courseId,
    })
    .from(topics)
    .innerJoin(courses, eq(courses.id, topics.courseId))
    .where(eq(courses.teacherId, teacherId))
    .orderBy(asc(topics.position), asc(topics.title));
}

/** Курсы для выпадающих списков в других разделах. */
export async function courseOptions(teacherId: string) {
  return db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(eq(courses.teacherId, teacherId))
    .orderBy(asc(courses.title));
}
