import { and, asc, count, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  assignments,
  attendance,
  courseRequests,
  courses,
  enrollments,
  groups,
  lessons,
  students,
  submissions,
  testAttempts,
  testGroups,
  tests,
  topics,
} from "@/db/schema";

/** id групп курса — граница для всех остальных выборок. */
async function courseGroupIds(courseId: string) {
  const rows = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.courseId, courseId));
  return rows.map((r) => r.id);
}

/** Сводка по курсу для вкладки «Обзор». */
export async function getCourseOverview(teacherId: string, courseId: string) {
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);
  if (!course) return null;

  const gids = await courseGroupIds(courseId);

  const [
    [topicCount],
    [groupCount],
    [studentCount],
    [lessonCount],
    [upcomingCount],
    [hwPending],
    [testCount],
    [openRequests],
  ] = await Promise.all([
    db.select({ n: count() }).from(topics).where(eq(topics.courseId, courseId)),
    db.select({ n: count() }).from(groups).where(eq(groups.courseId, courseId)),
    gids.length
      ? db
          .select({ n: sql<number>`count(distinct ${enrollments.studentId})` })
          .from(enrollments)
          .where(
            and(inArray(enrollments.groupId, gids), isNull(enrollments.leftAt)),
          )
      : Promise.resolve([{ n: 0 }]),
    gids.length
      ? db
          .select({ n: count() })
          .from(lessons)
          .where(inArray(lessons.groupId, gids))
      : Promise.resolve([{ n: 0 }]),
    gids.length
      ? db
          .select({ n: count() })
          .from(lessons)
          .where(
            and(
              inArray(lessons.groupId, gids),
              sql`${lessons.startsAt} >= now()`,
              ne(lessons.status, "cancelled"),
            ),
          )
      : Promise.resolve([{ n: 0 }]),
    gids.length
      ? db
          .select({ n: count() })
          .from(submissions)
          .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
          .where(
            and(
              inArray(assignments.groupId, gids),
              eq(submissions.status, "submitted"),
            ),
          )
      : Promise.resolve([{ n: 0 }]),
    gids.length
      ? db
          .select({ n: sql<number>`count(distinct ${testGroups.testId})` })
          .from(testGroups)
          .where(inArray(testGroups.groupId, gids))
      : Promise.resolve([{ n: 0 }]),
    db
      .select({ n: count() })
      .from(courseRequests)
      .where(
        and(
          eq(courseRequests.courseId, courseId),
          eq(courseRequests.status, "pending"),
        ),
      ),
  ]);

  return {
    course,
    stats: {
      topics: Number(topicCount.n),
      groups: Number(groupCount.n),
      students: Number(studentCount.n),
      lessons: Number(lessonCount.n),
      upcoming: Number(upcomingCount.n),
      hwPending: Number(hwPending.n),
      tests: Number(testCount.n),
      openRequests: Number(openRequests.n),
    },
  };
}

/** Занятия всех групп курса. */
export async function listCourseLessons(courseId: string) {
  const gids = await courseGroupIds(courseId);
  if (gids.length === 0) return [];

  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      status: lessons.status,
      groupId: groups.id,
      groupTitle: groups.title,
      topicTitle: topics.title,
    })
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .leftJoin(topics, eq(topics.id, lessons.topicId))
    .where(inArray(lessons.groupId, gids))
    .orderBy(desc(lessons.startsAt));
}

/** Домашние задания всех групп курса. */
export async function listCourseAssignments(courseId: string) {
  const gids = await courseGroupIds(courseId);
  if (gids.length === 0) return [];

  return db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueAt: assignments.dueAt,
      createdAt: assignments.createdAt,
      groupTitle: groups.title,
      total: count(submissions.studentId),
      pending: sql<number>`count(*) filter (where ${submissions.status} = 'submitted')`,
    })
    .from(assignments)
    .leftJoin(groups, eq(groups.id, assignments.groupId))
    .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
    .where(inArray(assignments.groupId, gids))
    .groupBy(assignments.id, groups.title)
    .orderBy(desc(assignments.createdAt));
}

/** Тесты, назначенные хотя бы одной группе курса. */
export async function listCourseTests(teacherId: string, courseId: string) {
  const gids = await courseGroupIds(courseId);
  if (gids.length === 0) return [];

  // id тестов, назначенных группам курса.
  const assigned = await db
    .selectDistinct({ testId: testGroups.testId })
    .from(testGroups)
    .where(inArray(testGroups.groupId, gids));

  const testIds = assigned.map((r) => r.testId);
  if (testIds.length === 0) return [];

  return db
    .select({
      id: tests.id,
      title: tests.title,
      status: tests.status,
      timeLimitMin: tests.timeLimitMin,
      closesAt: tests.closesAt,
      questionCount: sql<number>`(select count(*) from test_questions q where q.test_id = ${tests.id})`,
      attempts: sql<number>`(select count(*) from test_attempts a where a.test_id = ${tests.id})`,
    })
    .from(tests)
    .where(and(eq(tests.teacherId, teacherId), inArray(tests.id, testIds)))
    .orderBy(desc(tests.createdAt));
}

/** Ученики курса + необработанные заявки. */
export async function listCourseStudents(courseId: string) {
  const gids = await courseGroupIds(courseId);

  const members = gids.length
    ? await db
        .selectDistinct({
          id: students.id,
          fullName: students.fullName,
          email: students.email,
          phone: students.phone,
          status: students.status,
          groupTitle: groups.title,
        })
        .from(enrollments)
        .innerJoin(students, eq(students.id, enrollments.studentId))
        .innerJoin(groups, eq(groups.id, enrollments.groupId))
        .where(
          and(inArray(enrollments.groupId, gids), isNull(enrollments.leftAt)),
        )
        .orderBy(asc(students.fullName))
    : [];

  const attendanceRows = gids.length
    ? await db
        .select({
          studentId: attendance.studentId,
          attended: sql<number>`count(*) filter (where ${attendance.status} in ('present','late'))`,
          counted: sql<number>`count(*) filter (where ${attendance.status} <> 'excused')`,
        })
        .from(attendance)
        .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
        .where(inArray(lessons.groupId, gids))
        .groupBy(attendance.studentId)
    : [];

  const rateByStudent = new Map(
    attendanceRows.map((r) => [
      r.studentId,
      Number(r.counted) > 0
        ? Math.round((Number(r.attended) / Number(r.counted)) * 100)
        : null,
    ]),
  );

  return {
    members: members.map((m) => ({
      ...m,
      attendanceRate: rateByStudent.get(m.id) ?? null,
    })),
  };
}
