import type { AttendanceKey } from "@/lib/labels";

/**
 * Чистая арифметика сводки — без обращений к базе, чтобы модуль можно было
 * использовать где угодно и проверять отдельно от БД.
 */

export type AttendanceCell = AttendanceKey | null;

export type AttendanceRow = {
  lessonId: string;
  title: string;
  startsAt: Date;
  studentId: string | null;
  status: AttendanceKey | null;
};

export type AttendanceMatrix = {
  lessons: { id: string; title: string; startsAt: Date }[];
  /** Ключ — `${lessonId}:${studentId}`. */
  marks: Map<string, AttendanceKey>;
};

/**
 * Разворачивает плоские строки запроса в список занятий и отметки.
 * Занятие без единой отметки всё равно остаётся столбцом — иначе в сводке
 * пропадали бы ещё не проверенные занятия.
 */
export function buildMatrix(rows: AttendanceRow[]): AttendanceMatrix {
  const lessonMap = new Map<
    string,
    { id: string; title: string; startsAt: Date }
  >();
  const marks = new Map<string, AttendanceKey>();

  for (const row of rows) {
    if (!lessonMap.has(row.lessonId)) {
      lessonMap.set(row.lessonId, {
        id: row.lessonId,
        title: row.title,
        startsAt: row.startsAt,
      });
    }

    if (row.studentId && row.status) {
      marks.set(`${row.lessonId}:${row.studentId}`, row.status);
    }
  }

  return { lessons: [...lessonMap.values()], marks };
}

/**
 * Процент посещения одного ученика.
 *
 * Опоздание считается посещением, а уважительная причина исключается из
 * знаменателя: она не заслуга и не вина, поэтому не должна ни улучшать,
 * ни ухудшать показатель. Занятия без отметки не учитываются вовсе.
 */
export function attendanceRate(cells: AttendanceCell[]) {
  let attended = 0;
  let counted = 0;
  let excused = 0;
  let missed = 0;

  for (const cell of cells) {
    if (cell === null) continue;

    if (cell === "excused") {
      excused++;
      continue;
    }

    counted++;
    if (cell === "present" || cell === "late") attended++;
    else missed++;
  }

  return {
    attended,
    missed,
    excused,
    counted,
    percent: counted === 0 ? null : Math.round((attended / counted) * 100),
  };
}
