import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  courseRequests,
  courses,
  enrollments,
  groups,
  students,
  teacherProfiles,
  topics,
  users,
} from "@/db/schema";

/** Опубликованные курсы для каталога. */
export async function listPublicCourses() {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      level: courses.level,
      description: courses.description,
      enrollmentOpen: courses.enrollmentOpen,
      teacherName: users.name,
      teacherHeadline: teacherProfiles.headline,
    })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.teacherId))
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, courses.teacherId))
    .where(eq(courses.isPublic, true))
    .orderBy(asc(courses.title));
}

/** Публичная страница курса по slug. */
export async function getPublicCourse(slug: string) {
  const [course] = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      level: courses.level,
      description: courses.description,
      enrollmentOpen: courses.enrollmentOpen,
      teacherId: courses.teacherId,
      teacherName: users.name,
      teacherHeadline: teacherProfiles.headline,
      teacherBio: teacherProfiles.bio,
    })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.teacherId))
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, courses.teacherId))
    .where(and(eq(courses.slug, slug), eq(courses.isPublic, true)))
    .limit(1);

  if (!course) return null;

  const program = await db
    .select({ id: topics.id, title: topics.title, description: topics.description })
    .from(topics)
    .where(eq(topics.courseId, course.id))
    .orderBy(asc(topics.position), asc(topics.title));

  return { ...course, program };
}

/** Статус ученика по отношению к курсу: заявка и/или зачисление. */
export async function studentCourseStatus(studentId: string, courseId: string) {
  const [request] = await db
    .select({ status: courseRequests.status })
    .from(courseRequests)
    .where(
      and(
        eq(courseRequests.courseId, courseId),
        eq(courseRequests.studentId, studentId),
      ),
    )
    .limit(1);

  const [enrolled] = await db
    .select({ groupId: enrollments.groupId })
    .from(enrollments)
    .innerJoin(groups, eq(groups.id, enrollments.groupId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        isNull(enrollments.leftAt),
        eq(groups.courseId, courseId),
      ),
    )
    .limit(1);

  return {
    requestStatus: request?.status ?? null,
    enrolled: !!enrolled,
  };
}

/** Заявки ученика на курсы — для его кабинета. */
export async function listStudentCourseRequests(studentId: string) {
  return db
    .select({
      courseId: courseRequests.courseId,
      courseTitle: courses.title,
      status: courseRequests.status,
      createdAt: courseRequests.createdAt,
    })
    .from(courseRequests)
    .innerJoin(courses, eq(courses.id, courseRequests.courseId))
    .where(eq(courseRequests.studentId, studentId))
    .orderBy(asc(courseRequests.createdAt));
}

/** Заявки на курсы преподавателя — для страницы курса. */
export async function listCourseRequests(courseId: string) {
  return db
    .select({
      id: courseRequests.id,
      status: courseRequests.status,
      message: courseRequests.message,
      createdAt: courseRequests.createdAt,
      studentId: courseRequests.studentId,
      studentName: students.fullName,
    })
    .from(courseRequests)
    .innerJoin(students, eq(students.id, courseRequests.studentId))
    .where(eq(courseRequests.courseId, courseId))
    .orderBy(asc(courseRequests.createdAt));
}
