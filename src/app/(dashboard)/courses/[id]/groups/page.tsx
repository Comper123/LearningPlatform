import Link from "next/link";

import { Badge, Card, EmptyState } from "@/components/ui";
import { listGroups } from "@/lib/groups/queries";
import { groupStatus } from "@/lib/labels";
import { requireTeacher } from "@/lib/session";

import { GroupForm } from "../../../groups/GroupForm";

export default async function CourseGroupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const groups = (await listGroups(teacher.id)).filter(
    (g) => g.courseId === id,
  );

  return (
    <>
      <h2 className="mb-4 font-medium">Группы курса</h2>

      <div className="mb-5">
        <GroupForm courses={[]} fixedCourseId={id} />
      </div>

      {groups.length === 0 ? (
        <EmptyState>Ни одна группа не учится по этому курсу.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="h-full p-4 transition hover:border-accent">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{group.title}</p>
                  <Badge {...groupStatus[group.status]} />
                </div>
                {group.scheduleNote && (
                  <p className="mt-1 text-xs text-muted">{group.scheduleNote}</p>
                )}
                <p className="mt-3 text-xs text-muted">
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
