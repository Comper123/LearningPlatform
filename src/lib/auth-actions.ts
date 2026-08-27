"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn } from "@/auth";
import { firstIssue, type FormState } from "@/lib/form";
import {
  canBecomeTeacher,
  createPasswordUser,
  findTeacherByInviteCode,
  joinAsStudent,
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
 * Регистрация ученика: нужен код приглашения конкретного преподавателя.
 * Без кода аккаунт не создаётся вовсе.
 */
export async function registerStudent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({ ...credentials, code: z.string().trim().min(4, "Введите код преподавателя") })
    .safeParse({
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
      fullName: formData.get("fullName") ?? "",
      code: formData.get("code") ?? "",
    });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { email, password, fullName, code } = parsed.data;

  if (!(await findTeacherByInviteCode(code))) {
    return { error: "Код не найден — проверьте его у преподавателя" };
  }

  const created = await createPasswordUser(email, password, fullName, "student");
  if ("error" in created) return { error: created.error };

  const joinError = await joinAsStudent(created.id, code, fullName, email);
  if (joinError) return { error: joinError };

  return signInOrError(
    email,
    password,
    "/me",
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

/** Вошёл через Google и объявил себя учеником — проверяем код. */
export async function onboardAsStudent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({
      fullName: credentials.fullName,
      code: z.string().trim().min(4, "Введите код преподавателя"),
    })
    .safeParse({
      fullName: formData.get("fullName") ?? "",
      code: formData.get("code") ?? "",
    });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const error = await joinAsStudent(
    user.id,
    parsed.data.code,
    parsed.data.fullName,
    user.email,
  );

  if (error) return { error };

  redirect("/me");
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
