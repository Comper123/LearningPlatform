import Link from "next/link";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { courseOptions } from "@/lib/courses/queries";
import { listGroups } from "@/lib/groups/queries";
import { groupStatus } from "@/lib/labels";
import { requireTeacher } from "@/lib/session";

import { GroupForm } from "./GroupForm";

export default async function GroupsPage() {
  const teacher = await requireTeacher();
  const [groups, courses] = await Promise.all([
    listGroups(teacher.id),
    courseOptions(teacher.id),
  ]);

  return (
    <>
      <PageHeader title="Группы" description="Учебные группы и их состав" />

      <div className="mb-6">
        <GroupForm courses={courses} />
      </div>

      {groups.length === 0 ? (
        <EmptyState>Групп пока нет — создайте первую.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="h-full p-5 transition hover:border-accent">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium">{group.title}</h2>
                  <Badge {...groupStatus[group.status]} />
                </div>

                <p className="mt-2 text-sm text-muted">
                  {group.courseTitle ?? "Без курса"}
                </p>
                {group.scheduleNote && (
                  <p className="mt-1 text-xs text-muted">{group.scheduleNote}</p>
                )}
                <p className="mt-4 text-xs text-muted">
                  Учеников: {group.studentCount}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
