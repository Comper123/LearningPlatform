import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { groups, lessons, scheduleSlots, topics } from "@/db/schema";

export async function listSlots(groupId: string) {
  return db
    .select()
    .from(scheduleSlots)
    .where(eq(scheduleSlots.groupId, groupId))
    .orderBy(asc(scheduleSlots.weekday), asc(scheduleSlots.startTime));
}

/** Занятия преподавателя за период — для календаря. */
export async function listLessonsBetween(
  teacherId: string,
  from: Date,
  to: Date,
) {
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      startsAt: lessons.startsAt,
      durationMin: lessons.durationMin,
      status: lessons.status,
      groupId: groups.id,
      groupTitle: groups.title,
      topicTitle: topics.title,
    })
    .from(lessons)
    .innerJoin(groups, eq(groups.id, lessons.groupId))
    .leftJoin(topics, eq(topics.id, lessons.topicId))
    .where(
      and(
        eq(groups.teacherId, teacherId),
        gte(lessons.startsAt, from),
        lte(lessons.startsAt, to),
      ),
    )
    .orderBy(asc(lessons.startsAt));
}
