import bcrypt from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  courseRequests,
  courses,
  students,
  teacherProfiles,
  users,
} from "@/db/schema";

export type Role = "pending" | "teacher" | "student";

/* --------------------------------------------------------------- доступ */

/** Адреса, которым роль преподавателя выдаётся автоматически. */
function teacherEmails() {
  return (process.env.TEACHER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Проверяет право стать преподавателем. Два независимых ключа: адрес в
 * TEACHER_EMAILS или секретный код TEACHER_SIGNUP_CODE. Если не задано
 * ни то ни другое — регистрация преподавателей закрыта совсем.
 */
export function canBecomeTeacher(email: string | null, code: string) {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  if (normalizedEmail && teacherEmails().includes(normalizedEmail)) return true;

  const expected = (process.env.TEACHER_SIGNUP_CODE ?? "").trim();
  return expected.length > 0 && code.trim() === expected;
}

/* ------------------------------------------------------------- профили */

/** Код вида "K7QF-2M9X": без символов, которые путают при диктовке. */
function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () =>
    Array.from(
      { length: 4 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");

  return `${pick()}-${pick()}`;
}

/** Выдаёт преподавателю код-приглашение, если его ещё нет. */
export async function ensureTeacherProfile(userId: string) {
  const [existing] = await db
    .select()
    .from(teacherProfiles)
    .where(eq(teacherProfiles.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(teacherProfiles)
    .values({ userId, inviteCode: generateInviteCode() })
    .onConflictDoNothing()
    .returning();

  return created;
}

/** Делает пользователя преподавателем и заводит ему код приглашения. */
export async function promoteToTeacher(userId: string) {
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, userId));
  return ensureTeacherProfile(userId);
}

/* -------------------------------------------------------------- ученики */

/**
 * Привязывает аккаунт к свободной карточке с тем же email — так ученик,
 * которого преподаватель завёл заранее, сразу попадает в свой кабинет.
 */
export async function linkStudentByEmail(userId: string, email: string) {
  const [candidate] = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(eq(sql`lower(${students.email})`, email.toLowerCase()), isNull(students.userId)),
    )
    .limit(1);

  if (!candidate) return null;

  await db
    .update(students)
    .set({ userId })
    .where(and(eq(students.id, candidate.id), isNull(students.userId)));

  await db.update(users).set({ role: "student" }).where(eq(users.id, userId));

  return candidate.id;
}

export async function findStudentByUser(userId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);

  return student ?? null;
}

/**
 * Заводит «свободного» ученика: без кода и без преподавателя. Он может
 * смотреть каталог и записываться на публичные курсы; преподаватель
 * появится, когда одобрит первую заявку.
 */
export async function createFreeStudent(
  userId: string,
  fullName: string,
  email?: string | null,
) {
  await db.update(users).set({ role: "student" }).where(eq(users.id, userId));

  const existing = await findStudentByUser(userId);
  if (existing) return existing;

  // Карточка могла быть заведена преподавателем заранее на этот email.
  if (email) {
    const linkedId = await linkStudentByEmail(userId, email);
    if (linkedId) return findStudentByUser(userId);
  }

  const [created] = await db
    .insert(students)
    .values({
      teacherId: null,
      userId,
      fullName: fullName.trim(),
      email: email ?? null,
      status: "active",
    })
    .returning();

  return created;
}

/** Преподаватель по коду приглашения. */
export async function findTeacherByInviteCode(code: string) {
  const [teacher] = await db
    .select({ userId: teacherProfiles.userId })
    .from(teacherProfiles)
    .where(eq(teacherProfiles.inviteCode, code.trim().toUpperCase()))
    .limit(1);

  return teacher ?? null;
}

/**
 * Присоединяет аккаунт к преподавателю по коду.
 * Возвращает текст ошибки или null при успехе.
 */
export async function joinAsStudent(
  userId: string,
  code: string,
  fullName: string,
  email?: string | null,
) {
  const teacher = await findTeacherByInviteCode(code);
  if (!teacher) return "Код не найден — проверьте его у преподавателя";

  if (await findStudentByUser(userId)) return null;

  // Карточка могла быть заведена заранее — тогда занимаем её.
  if (email && (await linkStudentByEmail(userId, email))) return null;

  // Самозапись — это заявка: преподаватель ещё должен её принять.
  await db.insert(students).values({
    teacherId: teacher.userId,
    userId,
    fullName: fullName.trim(),
    email: email ?? null,
    status: "pending",
  });

  await db.update(users).set({ role: "student" }).where(eq(users.id, userId));

  return null;
}

/**
 * Регистрация через публичный курс: кода нет, преподаватель определяется
 * курсом. Создаёт карточку ученика и заявку на курс.
 * Возвращает текст ошибки или null.
 */
export async function joinViaPublicCourse(
  userId: string,
  courseSlug: string,
  fullName: string,
  email?: string | null,
) {
  const [course] = await db
    .select({
      id: courses.id,
      teacherId: courses.teacherId,
      isPublic: courses.isPublic,
      enrollmentOpen: courses.enrollmentOpen,
    })
    .from(courses)
    .where(eq(courses.slug, courseSlug))
    .limit(1);

  if (!course || !course.isPublic) return "Курс не найден";
  if (!course.enrollmentOpen) return "Запись на курс закрыта";

  let student = await findStudentByUser(userId);

  if (!student && email) {
    const linkedId = await linkStudentByEmail(userId, email);
    if (linkedId) student = await findStudentByUser(userId);
  }

  if (!student) {
    const [created] = await db
      .insert(students)
      .values({
        teacherId: course.teacherId,
        userId,
        fullName: fullName.trim(),
        email: email ?? null,
        status: "pending",
      })
      .returning();
    student = created;
  }

  await db.update(users).set({ role: "student" }).where(eq(users.id, userId));

  await db
    .insert(courseRequests)
    .values({ courseId: course.id, studentId: student.id })
    .onConflictDoUpdate({
      target: [courseRequests.courseId, courseRequests.studentId],
      set: { status: "pending", createdAt: new Date(), decidedAt: null },
    });

  return null;
}

/* ---------------------------------------------------------------- вход */

/**
 * Роль для нового Google-аккаунта. Никто не становится преподавателем
 * сам по себе: без совпадения по TEACHER_EMAILS или заранее заведённой
 * карточки человек остаётся `pending` до выбора роли на /onboarding.
 */
export async function initializeOAuthUser(userId: string, email?: string | null) {
  const normalized = email?.trim().toLowerCase() ?? null;

  if (normalized && teacherEmails().includes(normalized)) {
    await promoteToTeacher(userId);
    return;
  }

  if (normalized) await linkStudentByEmail(userId, normalized);
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.trim().toLowerCase()))
    .limit(1);

  return user ?? null;
}

/** Создаёт аккаунт с паролем. Возвращает id или текст ошибки. */
export async function createPasswordUser(
  email: string,
  password: string,
  name: string,
  role: Role,
) {
  const normalized = email.trim().toLowerCase();
  const existing = await findUserByEmail(normalized);

  if (existing) {
    return { error: "Аккаунт с таким email уже есть — просто войдите" };
  }

  const [created] = await db
    .insert(users)
    .values({
      email: normalized,
      name: name.trim(),
      role,
      passwordHash: await bcrypt.hash(password, 10),
    })
    .returning({ id: users.id });

  return { id: created.id };
}

/** Проверка пары email+пароль для провайдера Credentials. */
export async function verifyPassword(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return { id: user.id, email: user.email, name: user.name, image: user.image };
}
