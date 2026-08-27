/** Человеческие подписи и цвета для enum-статусов из схемы. */

export const studentStatus = {
  pending: { label: "Заявка", style: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  rejected: { label: "Отклонена", style: "bg-red-500/10 text-red-600 dark:text-red-400" },
  active: { label: "Учится", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  paused: { label: "Пауза", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  archived: { label: "Архив", style: "bg-zinc-500/10 text-muted" },
} as const;

export const groupStatus = {
  planned: { label: "Набор", style: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  active: { label: "Идёт", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  finished: { label: "Завершена", style: "bg-zinc-500/10 text-muted" },
} as const;

export const lessonStatus = {
  planned: { label: "Запланировано", style: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  done: { label: "Проведено", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  cancelled: { label: "Отменено", style: "bg-zinc-500/10 text-muted" },
} as const;

export const attendanceStatus = {
  present: { label: "Был", short: "Б", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  absent: { label: "Не был", short: "Н", style: "bg-red-500/10 text-red-600 dark:text-red-400" },
  late: { label: "Опоздал", short: "О", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  excused: { label: "Уважительная", short: "У", style: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
} as const;

export type AttendanceKey = keyof typeof attendanceStatus;

export const submissionStatus = {
  assigned: { label: "Выдано", style: "bg-zinc-500/10 text-muted" },
  submitted: { label: "Сдано", style: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  reviewed: { label: "Проверено", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  redo: { label: "На доработку", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
} as const;
