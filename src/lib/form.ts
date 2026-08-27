import { z } from "zod";

/** Результат server action для форм: пусто — успех, error — что показать. */
export type FormState = { error?: string };

/** Пустая строка из FormData -> null, чтобы не писать "" в nullable-колонки. */
export const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Первая понятная ошибка валидации для показа под формой. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Проверьте заполнение формы";
}
