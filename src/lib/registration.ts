import bcrypt from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { students, teacherProfiles, users } from "@/db/schema";

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
