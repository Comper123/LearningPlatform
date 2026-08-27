import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  courses,
  enrollments,
  groups,
  topicProgress,
  topics,
} from "@/db/schema";

/**
 * Темы всех курсов, по которым ученик занимается, с его уровнем освоения.
 * Уровень null — тему ещё не оценивали.
 */
export async function listStudentProgress(studentId: string) {
  return db
    .selectDistinct({
      topicId: topics.id,
      topicTitle: topics.title,
      position: topics.position,
      courseTitle: courses.title,
      level: topicProgress.level,
      comment: topicProgress.comment,
    })
    .from(enrollments)
    .innerJoin(groups, eq(groups.id, enrollments.groupId))
    .innerJoin(courses, eq(courses.id, groups.courseId))
    .innerJoin(topics, eq(topics.courseId, courses.id))
    .leftJoin(
      topicProgress,
      and(
        eq(topicProgress.topicId, topics.id),
        eq(topicProgress.studentId, studentId),
      ),
    )
    .where(
      and(eq(enrollments.studentId, studentId), isNull(enrollments.leftAt)),
    )
    .orderBy(asc(courses.title), asc(topics.position), asc(topics.title));
}
