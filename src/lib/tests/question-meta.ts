/** Оформление типов вопросов — общее для форм и разборов. */

export type QuestionType = "single" | "multiple" | "text";

export const QUESTION_TYPES: Record<
  QuestionType,
  { label: string; short: string; hint: string; style: string }
> = {
  single: {
    label: "Один ответ",
    short: "1 из N",
    hint: "Ученик выбирает ровно один вариант",
    style: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  multiple: {
    label: "Несколько ответов",
    short: "N из N",
    hint: "Засчитывается, только если отмечены все верные и ни одного лишнего",
    style: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  text: {
    label: "Свободный ответ",
    short: "Текст",
    hint: "Проверяет преподаватель вручную",
    style: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};
