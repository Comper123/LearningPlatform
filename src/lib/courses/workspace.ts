import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  assignments,
  attendance,
  courses,
  enrollments,
  groups,
  lessonFiles,
  lessons,
  submissions,
  testAttempts,
  testGroups,
  tests,
  topicProgress,
  topics,
  users,
} from "@/db/schema";
import { attemptState } from "@/lib/tests/logic";

/**
 * Всё по одному курсу для ученика в одном месте: программа с его уровнем,
 * занятия с материалами, домашние задания, тесты, посещаемость.
 * Границы — группы ученика внутри этого курса.
 */
export async function getStudentCourseWorkspace(
  studentId: string,
  courseId: string,
) {
  // Группы ученика по этому курсу.
  const myGroups = await db
    .select({ id: groups.id, title: groups.title })
    .from(enrollments)
    .innerJoin(groups, eq(groups.id, enrollments.groupId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        isNull(enrollments.leftAt),
        eq(groups.courseId, courseId),
      ),
    )
    .orderBy(asc(groups.title));

  if (myGroups.length === 0) return null;

  const groupIds = myGroups.map((g) => g.id);

  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      level: courses.level,
      description: courses.description,
      teacherName: users.name,
    })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.teacherId))
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) return null;

  /* ------------------------------------------------------- программа */

  const program = await db
    .select({
      topicId: topics.id,
      title: topics.title,
      position: topics.position,
      level: topicProgress.level,
    })
    .from(topics)
    .leftJoin(
      topicProgress,
      and(
        eq(topicProgress.topicId, topics.id),
        eq(topicProgress.studentId, studentId),
      ),
    )
    .where(eq(topics.courseId, courseId))
    .orderBy(asc(topics.position), asc(topics.title));

  /* --------------------------------------------------------- занятия */

  const lessonRows = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      durationMin: lessons.durationMin,
      status: lessons.status,
      summary: lessons.summary,
      content: lessons.content,
      topicTitle: topics.title,
      attendanceStatus: attendance.status,
    })
    .from(lessons)
    .leftJoin(topics, eq(topics.id, lessons.topicId))
    .leftJoin(
      attendance,
      and(
        eq(attendance.lessonId, lessons.id),
        eq(attendance.studentId, studentId),
      ),
    )
    .where(inArray(lessons.groupId, groupIds))
    .orderBy(asc(lessons.startsAt));

  const files = lessonRows.length
    ? await db
        .select()
        .from(lessonFiles)
        .where(
          inArray(
            lessonFiles.lessonId,
            lessonRows.map((l) => l.id),
          ),
        )
        .orderBy(asc(lessonFiles.uploadedAt))
    : [];

  const lessonList = lessonRows.map((l) => ({
    ...l,
    files: files.filter((f) => f.lessonId === l.id),
  }));

  /* --------------------------------------------- домашние задания */

  const assignmentList = await db
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
    .where(
      and(
        eq(submissions.studentId, studentId),
        inArray(assignments.groupId, groupIds),
      ),
    )
    .orderBy(desc(assignments.createdAt));

  /* ----------------------------------------------------------- тесты */

  const testRows = await db
    .selectDistinct({
      id: tests.id,
      title: tests.title,
      timeLimitMin: tests.timeLimitMin,
      opensAt: tests.opensAt,
      closesAt: tests.closesAt,
    })
    .from(tests)
    .innerJoin(testGroups, eq(testGroups.testId, tests.id))
    .where(
      and(
        eq(tests.status, "published"),
        inArray(testGroups.groupId, groupIds),
      ),
    )
    .orderBy(desc(tests.opensAt));

  const testAttemptRows = testRows.length
    ? await db
        .select()
        .from(testAttempts)
        .where(
          and(
            eq(testAttempts.studentId, studentId),
            inArray(
              testAttempts.testId,
              testRows.map((t) => t.id),
            ),
          ),
        )
    : [];

  const attemptByTest = new Map(testAttemptRows.map((a) => [a.testId, a]));

  const testList = testRows.map((t) => {
    const attempt = attemptByTest.get(t.id) ?? null;
    return { ...t, attempt, state: attemptState(attempt) };
  });

  /* --------------------------------------------------- посещаемость */

  const marks = lessonRows.filter((l) => l.attendanceStatus);
  const attended = marks.filter(
    (l) => l.attendanceStatus === "present" || l.attendanceStatus === "late",
  ).length;

  return {
    course,
    groups: myGroups,
    program,
    lessons: lessonList,
    assignments: assignmentList,
    tests: testList,
    attendance: {
      marked: marks.length,
      attended,
      rate: marks.length ? Math.round((attended / marks.length) * 100) : null,
    },
  };
}

/** Курсы, на которые ученик записан (через свои группы). */
export async function listEnrolledCourses(studentId: string) {
  return db
    .selectDistinct({
      id: courses.id,
      title: courses.title,
      level: courses.level,
      teacherName: users.name,
      groupTitle: groups.title,
    })
    .from(enrollments)
    .innerJoin(groups, eq(groups.id, enrollments.groupId))
    .innerJoin(courses, eq(courses.id, groups.courseId))
    .innerJoin(users, eq(users.id, courses.teacherId))
    .where(
      and(eq(enrollments.studentId, studentId), isNull(enrollments.leftAt)),
    )
    .orderBy(asc(courses.title));
}
