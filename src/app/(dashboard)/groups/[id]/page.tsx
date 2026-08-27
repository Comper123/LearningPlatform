import Link from "next/link";
import { notFound } from "next/navigation";

import { Select } from "@/components/Select";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
} from "@/components/ui";
import { addMember, removeMember } from "@/lib/groups/actions";
import { getGroup, listCandidates, listGroupMembers } from "@/lib/groups/queries";
import { groupStatus, studentStatus } from "@/lib/labels";
import { listGroupLessons } from "@/lib/lessons/queries";
import { deleteSlot } from "@/lib/schedule/actions";
import { WEEKDAYS } from "@/lib/schedule/constants";
import { listSlots } from "@/lib/schedule/queries";
import { requireTeacher } from "@/lib/session";

import { GenerateForm } from "./GenerateForm";
import { ScheduleEditor } from "./ScheduleEditor";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const group = await getGroup(teacher.id, id);

  if (!group) notFound();

  const [members, candidates, lessons, slots] = await Promise.all([
    listGroupMembers(group.id),
    listCandidates(teacher.id, group.id),
    listGroupLessons(group.id),
    listSlots(group.id),
  ]);

  return (
    <>
      <Link href="/groups" className="text-sm text-muted hover:text-foreground">
        ← Все группы
      </Link>

      <div className="mt-3">
        <PageHeader
          title={group.title}
          description={[
            group.courseTitle ?? "Без курса",
            group.scheduleNote,
            group.startsOn && `старт ${group.startsOn}`,
          ]
            .filter(Boolean)
            .join(" · ")}
          action={<Badge {...groupStatus[group.status]} />}
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-4 font-medium">Расписание</h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            {slots.length > 0 && (
              <Card className="divide-y divide-border">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="text-sm">
                      {WEEKDAYS[slot.weekday]}, {slot.startTime}
                      <span className="ml-2 text-xs text-muted">
                        {slot.durationMin} мин
                      </span>
                    </span>

                    <form action={deleteSlot}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="slotId" value={slot.id} />
                      <IconButton
                        type="submit"
                        title="Убрать из расписания"
                        className="hover:text-danger"
                      >
                        ✕
                      </IconButton>
                    </form>
                  </div>
                ))}
              </Card>
            )}

            <ScheduleEditor groupId={group.id} />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-muted">
              Расставить занятия автоматически
            </h3>
            <GenerateForm
              groupId={group.id}
              hasSlots={slots.length > 0}
              hasCourse={!!group.courseId}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-medium">Состав ({members.length})</h2>
            <Link
              href={`/groups/${group.id}/attendance`}
              className="text-sm text-muted transition hover:text-accent"
            >
              Сводка посещаемости →
            </Link>
          </div>

          {candidates.length > 0 && (
            <Card className="mb-4 p-4">
              <form action={addMember} className="flex gap-2">
                <input type="hidden" name="groupId" value={group.id} />
                <Select
                  name="studentId"
                  className="flex-1"
                  placeholder="Выберите ученика…"
                  options={candidates.map((student) => ({
                    value: student.id,
                    label: student.fullName,
                  }))}
                />
                <Button type="submit">Записать</Button>
              </form>
            </Card>
          )}

          {members.length === 0 ? (
            <EmptyState>В группе пока никого нет.</EmptyState>
          ) : (
            <Card className="divide-y divide-border">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <Link
                    href={`/students/${member.id}`}
                    className="text-sm font-medium hover:text-accent"
                  >
                    {member.fullName}
                  </Link>

                  <div className="flex items-center gap-2">
                    <Badge {...studentStatus[member.status]} />
                    <form action={removeMember}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <input type="hidden" name="studentId" value={member.id} />
                      <IconButton
                        type="submit"
                        title="Отчислить из группы"
                        className="hover:text-danger"
                      >
                        ✕
                      </IconButton>
                    </form>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Занятия</h2>
            <Link href="/lessons" className="text-sm text-muted hover:text-accent">
              Все занятия →
            </Link>
          </div>

          {lessons.length === 0 ? (
            <EmptyState>Занятий пока нет.</EmptyState>
          ) : (
            <Card className="divide-y divide-border">
              {lessons.slice(0, 10).map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/lessons/${lesson.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:text-accent"
                >
                  <span>{lesson.title}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {lesson.startsAt.toLocaleDateString("ru-RU")}
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
