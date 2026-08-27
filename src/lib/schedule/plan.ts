export type Slot = { weekday: number; startTime: string; durationMin: number };
export type Occurrence = { startsAt: Date; durationMin: number };

/** 0 — понедельник, 6 — воскресенье. */
export const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

/**
 * Раскладывает слоты расписания в конкретные даты занятий.
 *
 * Отсчёт идёт от понедельника той недели, в которую попадает `from`,
 * а всё, что раньше самой даты `from`, отбрасывается — иначе при старте
 * в среду занятия появились бы задним числом в понедельник и вторник.
 */
export function planOccurrences(
  slots: Slot[],
  from: Date,
  weeks: number,
): Occurrence[] {
  const weekStart = new Date(from);
  weekStart.setDate(from.getDate() - mondayIndex(from));
  weekStart.setHours(0, 0, 0, 0);

  const result: Occurrence[] = [];

  for (let week = 0; week < weeks; week++) {
    for (const slot of slots) {
      const [hh, mm] = slot.startTime.split(":").map(Number);

      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + week * 7 + slot.weekday);
      date.setHours(hh, mm, 0, 0);

      if (date < from) continue;

      result.push({ startsAt: date, durationMin: slot.durationMin });
    }
  }

  return result.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
