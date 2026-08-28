"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";
import { firstIssue, type FormState } from "@/lib/form";
import {
  canBecomeTeacher,
  createFreeStudent,
  createPasswordUser,
  findTeacherByInviteCode,
  joinAsStudent,
  joinViaPublicCourse,
  promoteToTeacher,
} from "@/lib/registration";
import { requireUser } from "@/lib/session";

const credentials = {
  email: z.string().trim().email("Некорректный email"),
  password: z.string().min(8, "Пароль от 8 символов"),
  fullName: z.string().trim().min(2, "Укажите имя и фамилию"),
};

/** Вход по паролю. */
export async function loginWithPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({
      email: credentials.email,
      password: z.string().min(1, "Введите пароль"),
    })
    .safeParse({
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
    });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  return signInOrError(parsed.data.email, parsed.data.password, "/", "Неверный email или пароль");
}

/**
 * При успехе signIn бросает NEXT_REDIRECT — его нужно пропустить наружу,
 * поэтому ловим только ошибки самой авторизации.
 */
async function signInOrError(
  email: string,
  password: string,
  redirectTo: string,
  message: string,
): Promise<FormState> {
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) return { error: message };
    throw error;
  }

  return {};
}

/**
 * Регистрация ученика. Код приглашения необязателен:
 * - с кодом — заявка конкретному преподавателю (карточка `pending`);
 * - без кода — «свободный» ученик: смотрит каталог и записывается на
 *   публичные курсы, преподаватель появляется после одобрения заявки.
 */
export async function registerStudent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({ ...credentials, code: z.string().trim().default("") })
    .safeParse({
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
      fullName: formData.get("fullName") ?? "",
      code: formData.get("code") ?? "",
    });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { email, password, fullName, code } = parsed.data;

  if (code && !(await findTeacherByInviteCode(code))) {
    return { error: "Код не найден — проверьте его у преподавателя" };
  }

  const created = await createPasswordUser(email, password, fullName, "student");
  if ("error" in created) return { error: created.error };

  if (code) {
    const joinError = await joinAsStudent(created.id, code, fullName, email);
    if (joinError) return { error: joinError };
  } else {
    await createFreeStudent(created.id, fullName, email);
  }

  return signInOrError(
    email,
    password,
    code ? "/status" : "/catalog",
    "Аккаунт создан, но войти не вышло — попробуйте войти вручную",
  );
}

/**
 * Регистрация ученика из каталога: вместо кода преподавателя — slug
 * публичного курса. Заявка на курс создаётся сразу.
 */
export async function registerViaCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({ ...credentials, courseSlug: z.string().trim().min(1) })
    .safeParse({
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
      fullName: formData.get("fullName") ?? "",
      courseSlug: formData.get("courseSlug") ?? "",
    });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { email, password, fullName, courseSlug } = parsed.data;

  const created = await createPasswordUser(email, password, fullName, "student");
  if ("error" in created) return { error: created.error };

  const joinError = await joinViaPublicCourse(
    created.id,
    courseSlug,
    fullName,
    email,
  );
  if (joinError) return { error: joinError };

  return signInOrError(
    email,
    password,
    `/c/${courseSlug}`,
    "Аккаунт создан, но войти не вышло — попробуйте войти вручную",
  );
}

/**
 * Регистрация преподавателя: нужен либо адрес из TEACHER_EMAILS,
 * либо секретный код TEACHER_SIGNUP_CODE.
 */
export async function registerTeacher(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({ ...credentials, code: z.string().trim().default("") })
    .safeParse({
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
      fullName: formData.get("fullName") ?? "",
      code: formData.get("code") ?? "",
    });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { email, password, fullName, code } = parsed.data;

  if (!canBecomeTeacher(email, code)) {
    return { error: "Нет доступа к регистрации преподавателя: проверьте код" };
  }

  const created = await createPasswordUser(email, password, fullName, "teacher");
  if ("error" in created) return { error: created.error };

  await promoteToTeacher(created.id);

  return signInOrError(
    email,
    password,
    "/dashboard",
    "Аккаунт создан, но войти не вышло — попробуйте войти вручную",
  );
}

/* ------------------------------------------------- выбор роли после Google */

/**
 * Вошёл через Google и объявил себя учеником. Код необязателен: без него —
 * «свободный» ученик с доступом к каталогу.
 */
export async function onboardAsStudent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({
      fullName: credentials.fullName,
      code: z.string().trim().default(""),
    })
    .safeParse({
      fullName: formData.get("fullName") ?? "",
      code: formData.get("code") ?? "",
    });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  if (parsed.data.code) {
    const error = await joinAsStudent(
      user.id,
      parsed.data.code,
      parsed.data.fullName,
      user.email,
    );
    if (error) return { error };
    redirect("/status");
  }

  await createFreeStudent(user.id, parsed.data.fullName, user.email);
  redirect("/catalog");
}

/** Вошёл через Google и объявил себя преподавателем — проверяем ключ. */
export async function onboardAsTeacher(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "");

  if (!canBecomeTeacher(user.email ?? null, code)) {
    return { error: "Нет доступа к регистрации преподавателя: проверьте код" };
  }

  await promoteToTeacher(user.id);

  redirect("/dashboard");
}
