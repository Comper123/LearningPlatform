"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { courseRequests, courses, enrollments, students } from "@/db/schema";
import { firstIssue, optionalText, type FormState } from "@/lib/form";
import { slugify } from "@/lib/courses/slug";
import { requireStudent, requireTeacher } from "@/lib/session";

async function assertOwnCourse(teacherId: string, courseId: string) {
  const [row] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacherId)))
    .limit(1);
  return !!row;
}

const publishSchema = z.object({
  courseId: z.string().uuid(),
  isPublic: z.string().nullable(),
  enrollmentOpen: z.string().nullable(),
  slug: optionalText,
});

/** Настройки публикации курса: видимость, slug, приём заявок. */
export async function updateCoursePublish(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = publishSchema.safeParse({
    courseId: formData.get("courseId") ?? "",
    isPublic: formData.get("isPublic"),
    enrollmentOpen: formData.get("enrollmentOpen"),
    slug: formData.get("slug") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await assertOwnCourse(teacher.id, parsed.data.courseId))) {
    return { error: "Курс не найден" };
  }

  const isPublic = parsed.data.isPublic !== null;
  let slug = parsed.data.slug ? slugify(parsed.data.slug) : null;

  if (isPublic && !slug) return { error: "Для публикации нужен адрес (slug)" };

  if (slug) {
    // slug уникален среди всех курсов — проверяем, что не занят чужим.
    const [clash] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);

    if (clash && clash.id !== parsed.data.courseId) {
      return { error: "Такой адрес уже занят — выберите другой" };
    }
  } else {
    slug = null;
  }

  await db
    .update(courses)
    .set({
      isPublic,
      slug,
      enrollmentOpen: parsed.data.enrollmentOpen !== null,
    })
    .where(eq(courses.id, parsed.data.courseId));

  revalidatePath(`/courses/${parsed.data.courseId}`);
  if (slug) revalidatePath(`/c/${slug}`);
  revalidatePath("/catalog");
  return {};
}

/* ------------------------------------------------- заявки на курс */

/** Ученик записывается на публичный курс — создаётся заявка. */
export async function requestCourseEnrollment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { student } = await requireStudent();
  const courseId = String(formData.get("courseId") ?? "");
  const message = String(formData.get("message") ?? "").trim() || null;

  const [course] = await db
    .select({
      id: courses.id,
      isPublic: courses.isPublic,
      enrollmentOpen: courses.enrollmentOpen,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course || !course.isPublic) return { error: "Курс не найден" };
  if (!course.enrollmentOpen) return { error: "Запись на курс закрыта" };

  await db
    .insert(courseRequests)
    .values({ courseId, studentId: student.id, message })
    .onConflictDoUpdate({
      target: [courseRequests.courseId, courseRequests.studentId],
      // Повторная запись после отказа снова становится заявкой.
      set: { status: "pending", message, createdAt: new Date(), decidedAt: null },
    });

  revalidatePath("/me/tests");
  return {};
}

/** Преподаватель одобряет заявку и зачисляет ученика в группу. */
export async function approveCourseRequest(formData: FormData) {
  const teacher = await requireTeacher();
  const requestId = String(formData.get("requestId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  if (!requestId || !groupId) return;

  const [request] = await db
    .select({
      id: courseRequests.id,
      courseId: courseRequests.courseId,
      studentId: courseRequests.studentId,
      teacherId: courses.teacherId,
    })
    .from(courseRequests)
    .innerJoin(courses, eq(courses.id, courseRequests.courseId))
    .where(eq(courseRequests.id, requestId))
    .limit(1);

  if (!request || request.teacherId !== teacher.id) return;

  await db.transaction(async (tx) => {
    await tx
      .update(courseRequests)
      .set({ status: "approved", decidedAt: new Date() })
      .where(eq(courseRequests.id, requestId));

    // Свободный ученик закрепляется за преподавателем этого курса.
    await tx
      .update(students)
      .set({ teacherId: teacher.id })
      .where(
        and(eq(students.id, request.studentId), isNull(students.teacherId)),
      );

    // Уже зачислен? Снимаем возможный leftAt, иначе добавляем.
    await tx
      .insert(enrollments)
      .values({ groupId, studentId: request.studentId })
      .onConflictDoUpdate({
        target: [enrollments.groupId, enrollments.studentId],
        set: { leftAt: null, joinedAt: new Date() },
      });
  });

  revalidatePath(`/courses/${request.courseId}`);
  revalidatePath(`/groups/${groupId}`);
}

export async function rejectCourseRequest(formData: FormData) {
  const teacher = await requireTeacher();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;

  const [request] = await db
    .select({ courseId: courseRequests.courseId, teacherId: courses.teacherId })
    .from(courseRequests)
    .innerJoin(courses, eq(courses.id, courseRequests.courseId))
    .where(eq(courseRequests.id, requestId))
    .limit(1);

  if (!request || request.teacherId !== teacher.id) return;

  await db
    .update(courseRequests)
    .set({ status: "rejected", decidedAt: new Date() })
    .where(eq(courseRequests.id, requestId));

  revalidatePath(`/courses/${request.courseId}`);
}

/** Ученик отзывает свою заявку. */
export async function cancelCourseRequest(formData: FormData) {
  const { student } = await requireStudent();
  const courseId = String(formData.get("courseId") ?? "");

  await db
    .delete(courseRequests)
    .where(
      and(
        eq(courseRequests.courseId, courseId),
        eq(courseRequests.studentId, student.id),
        eq(courseRequests.status, "pending"),
      ),
    );

  revalidatePath("/catalog");
}
