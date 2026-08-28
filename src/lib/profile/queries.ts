import { and, count, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  courses,
  enrollments,
  groups,
  students,
  submissions,
  testAttempts,
} from "@/db/schema";
import { attendanceRate } from "@/lib/attendance/matrix";
import { listStudentAttendance } from "@/lib/lessons/queries";

export async function getTeacherStats(teacherId: string) {
  const [[st], [gr], [co], [pub], firstPublic] = await Promise.all([
    db
      .select({ n: count() })
      .from(students)
      .where(
        and(eq(students.teacherId, teacherId), ne(students.status, "pending")),
      ),
    db.select({ n: count() }).from(groups).where(eq(groups.teacherId, teacherId)),
    db.select({ n: count() }).from(courses).where(eq(courses.teacherId, teacherId)),
    db
      .select({ n: count() })
      .from(courses)
      .where(and(eq(courses.teacherId, teacherId), eq(courses.isPublic, true))),
    db
      .select({ slug: courses.slug, title: courses.title })
      .from(courses)
      .where(and(eq(courses.teacherId, teacherId), eq(courses.isPublic, true)))
      .limit(1),
  ]);

  return {
    students: Number(st.n),
    groups: Number(gr.n),
    courses: Number(co.n),
    publicCourses: Number(pub.n),
    publicCourse: firstPublic[0] ?? null,
  };
}

export async function getStudentStats(studentId: string) {
  const [[courseCount], [testCount], [hwCount], attendance] = await Promise.all([
    db
      .select({ n: count() })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(eq(enrollments.studentId, studentId), isNull(enrollments.leftAt)),
      ),
    db
      .select({ n: count() })
      .from(testAttempts)
      .where(eq(testAttempts.studentId, studentId)),
    db
      .select({ n: count() })
      .from(submissions)
      .where(
        and(
          eq(submissions.studentId, studentId),
          ne(submissions.status, "assigned"),
        ),
      ),
    listStudentAttendance(studentId),
  ]);

  const rate = attendanceRate(attendance.map((a) => a.status));

  return {
    courses: Number(courseCount.n),
    testsTaken: Number(testCount.n),
    homeworkSubmitted: Number(hwCount.n),
    attendancePercent: rate.percent,
  };
}
