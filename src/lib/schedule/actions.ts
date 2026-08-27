"use server";

import { and, asc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { groups, lessons, scheduleSlots, topics } from "@/db/schema";
import { firstIssue, type FormState } from "@/lib/form";
import { assertOwnGroup } from "@/lib/groups/actions";
import { planOccurrences } from "@/lib/schedule/plan";
import { requireTeacher } from "@/lib/session";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const slotSchema = z.object({
  groupId: z.string().uuid("Группа не найдена"),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().trim().regex(timePattern, "Время в формате 18:00"),
  durationMin: z.coerce.number().int().min(15).max(600),
});

export async function addSlot(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = slotSchema.safeParse({
    groupId: formData.get("groupId") ?? "",
    weekday: formData.get("weekday") ?? "0",
    startTime: formData.get("startTime") ?? "",
    durationMin: formData.get("durationMin") ?? 90,
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await assertOwnGroup(teacher.id, parsed.data.groupId))) {
    return { error: "Группа не найдена" };
  }

  await db.insert(scheduleSlots).values(parsed.data);

  revalidatePath(`/groups/${parsed.data.groupId}`);
  return {};
}

export async function deleteSlot(formData: FormData) {
  const teacher = await requireTeacher();
  const slotId = String(formData.get("slotId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");

  if (!slotId || !groupId) return;
  if (!(await assertOwnGroup(teacher.id, groupId))) return;

  await db
    .delete(scheduleSlots)
    .where(
      and(eq(scheduleSlots.id, slotId), eq(scheduleSlots.groupId, groupId)),
    );

  revalidatePath(`/groups/${groupId}`);
}

/* ------------------------------------------------------------ генерация */

const generateSchema = z.object({
  groupId: z.string().uuid("Группа не найдена"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату начала"),
  weeks: z.coerce.number().int().min(1).max(52),
  withTopics: z.string().nullable(),
});

/**
 * Расставляет занятия по расписанию группы на несколько недель вперёд.
 *
 * Повторный запуск безопасен: занятия, которые уже стоят на то же время,
 * пропускаются — поэтому период можно продлевать по мере надобности.
 */
export async function generateLessons(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacher = await requireTeacher();
  const parsed = generateSchema.safeParse({
    groupId: formData.get("groupId") ?? "",
    from: formData.get("from") ?? "",
    weeks: formData.get("weeks") ?? 8,
    withTopics: formData.get("withTopics"),
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { groupId, from, weeks } = parsed.data;
  const withTopics = parsed.data.withTopics !== null;

  if (!(await assertOwnGroup(teacher.id, groupId))) {
    return { error: "Группа не найдена" };
  }

  const slots = await db
    .select()
    .from(scheduleSlots)
    .where(eq(scheduleSlots.groupId, groupId))
    .orderBy(asc(scheduleSlots.weekday), asc(scheduleSlots.startTime));

  if (slots.length === 0) {
    return { error: "Сначала задайте расписание группы" };
  }

  const [y, m, d] = from.split("-").map(Number);
  const start = new Date(y, m - 1, d);

  const planned = planOccurrences(slots, start, weeks);

  const existing = await db
    .select({ startsAt: lessons.startsAt })
    .from(lessons)
    .where(and(eq(lessons.groupId, groupId), gte(lessons.startsAt, start)));

  const taken = new Set(existing.map((l) => l.startsAt.getTime()));
  const fresh = planned.filter((p) => !taken.has(p.startsAt.getTime()));

  if (fresh.length === 0) {
    return { error: "На этот период занятия уже стоят" };
  }

  const nextTopics = withTopics ? await unusedTopics(groupId) : [];

  await db.insert(lessons).values(
    fresh.map((item, index) => {
      const topic = nextTopics[index];

      return {
        groupId,
        startsAt: item.startsAt,
        durationMin: item.durationMin,
        topicId: topic?.id ?? null,
        title: topic?.title ?? "Занятие",
      };
    }),
  );

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/lessons");
  return {};
}

/**
 * Темы курса, которые ещё не привязаны ни к одному занятию группы,
 * в порядке программы — чтобы новые занятия продолжали курс, а не
 * начинали его заново.
 */
async function unusedTopics(groupId: string) {
  const [group] = await db
    .select({ courseId: groups.courseId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group?.courseId) return [];

  const all = await db
    .select({ id: topics.id, title: topics.title })
    .from(topics)
    .where(eq(topics.courseId, group.courseId))
    .orderBy(asc(topics.position), asc(topics.title));

  if (all.length === 0) return [];

  const used = await db
    .select({ topicId: lessons.topicId })
    .from(lessons)
    .where(
      and(
        eq(lessons.groupId, groupId),
        isNotNull(lessons.topicId),
        inArray(
          lessons.topicId,
          all.map((t) => t.id),
        ),
      ),
    );

  const usedIds = new Set(used.map((u) => u.topicId));
  return all.filter((t) => !usedIds.has(t.id));
}
