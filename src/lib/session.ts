import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { findStudentByUser, type Role } from "@/lib/registration";

/** Любой вошедший пользователь или редирект на вход. */
export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  return { ...session.user, id: session.user.id };
}

/** Преподаватель. Остальных уводим туда, где им место. */
export async function requireTeacher() {
  const user = await requireUser();

  if (user.role !== "teacher") redirect(homePathFor(user.role));

  return user;
}

/** Ученик вместе с его карточкой. */
export async function requireStudent() {
  const user = await requireUser();

  if (user.role !== "student") redirect(homePathFor(user.role));

  // Роль есть, а карточки нет — состояние аномальное, но не тупиковое:
  // отправляем заново пройти привязку по коду.
  const student = await findStudentByUser(user.id);
  if (!student) redirect("/onboarding");

  // Заявка ещё не рассмотрена или отклонена — данных не показываем.
  if (student.status === "pending" || student.status === "rejected") {
    redirect("/status");
  }

  return { user, student };
}

/** Куда отправить человека после входа. */
export function homePathFor(role: Role) {
  if (role === "teacher") return "/dashboard";
  if (role === "student") return "/me";
  return "/onboarding";
}
