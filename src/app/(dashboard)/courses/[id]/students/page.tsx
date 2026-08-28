import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Badge, Card, EmptyState } from "@/components/ui";
import { listCourseGroups } from "@/lib/courses/queries";
import { listCourseRequests } from "@/lib/courses/public";
import { listCourseStudents } from "@/lib/courses/teacher-workspace";
import { studentStatus } from "@/lib/labels";
import { matchesQuery, num, pickSort, text } from "@/lib/list-utils";
import { requireTeacher } from "@/lib/session";

import { CourseRequests } from "../CourseRequests";

export default async function CourseStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; group?: string; sort?: string }>;
}) {
  const { id } = await params;
  const { q, group, sort } = await searchParams;
  await requireTeacher();

  const [{ members }, requests, courseGroups] = await Promise.all([
    listCourseStudents(id),
    listCourseRequests(id),
    listCourseGroups(id),
  ]);

  const pending = requests.filter((r) => r.status === "pending");

  const rows = members
    .filter(
      (m) =>
        matchesQuery(q, m.fullName, m.email, m.phone) &&
        (!group || m.groupTitle === group),
    )
    .sort(
      pickSort(sort, {
        name: (a, b) => text(a.fullName, b.fullName),
        attendance: (a, b) =>
          num(b.attendanceRate ?? -1, a.attendanceRate ?? -1),
      }, "name"),
    );

  return (
    <>
      <h2 className="mb-4 font-medium">
        Заявки на курс
        {pending.length > 0 && ` · ${pending.length}`}
      </h2>
      <div className="mb-8">
        <CourseRequests requests={pending} groups={courseGroups} />
      </div>

      <h2 className="mb-4 font-medium">Ученики курса ({members.length})</h2>

      {members.length > 0 && (
        <ListControls
          search={{ placeholder: "Имя, почта, телефон" }}
          filters={[
            {
              key: "group",
              label: "Любая группа",
              options: [
                { value: "", label: "Любая группа" },
                ...courseGroups.map((g) => ({ value: g.title, label: g.title })),
              ],
            },
          ]}
          sort={[
            { value: "name", label: "По имени" },
            { value: "attendance", label: "По посещаемости" },
          ]}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState>
          {members.length === 0
            ? "На курс ещё никто не записан."
            : "Под фильтры никто не подходит."}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2 text-left">
              <tr className="text-xs font-medium tracking-wide text-muted uppercase">
                <th className="px-4 py-3">Имя</th>
                <th className="px-4 py-3">Группа</th>
                <th className="px-4 py-3">Посещаемость</th>
                <th className="px-4 py-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/students/${m.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {m.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{m.groupTitle}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {m.attendanceRate === null ? "—" : `${m.attendanceRate}%`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge {...studentStatus[m.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
