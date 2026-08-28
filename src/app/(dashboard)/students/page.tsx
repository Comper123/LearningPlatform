import Link from "next/link";

import { ListControls } from "@/components/ListControls";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { studentStatus } from "@/lib/labels";
import { matchesQuery, pickSort, text } from "@/lib/list-utils";
import { ensureTeacherProfile } from "@/lib/registration";
import { requireTeacher } from "@/lib/session";
import { listPendingRequests, listStudents } from "@/lib/students/queries";

import { RequestList } from "./RequestList";
import { StudentForm } from "./StudentForm";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const { q, status, sort } = await searchParams;
  const teacher = await requireTeacher();
  const [all, requests, profile] = await Promise.all([
    listStudents(teacher.id),
    listPendingRequests(teacher.id),
    ensureTeacherProfile(teacher.id),
  ]);

  const students = all
    .filter(
      (s) =>
        matchesQuery(q, s.fullName, s.email, s.phone, s.telegram) &&
        (!status || s.status === status),
    )
    .sort(
      pickSort(sort, {
        name: (a, b) => text(a.fullName, b.fullName),
        recent: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        status: (a, b) => text(a.status, b.status),
      }, "name"),
    );

  return (
    <>
      <PageHeader
        title="Ученики"
        description={`Показано: ${students.length} из ${all.length}`}
      />

      <RequestList requests={requests} />

      <Card className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm">
        <span className="text-muted">Код для самостоятельной регистрации:</span>
        <code className="rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-base tracking-widest">
          {profile?.inviteCode ?? "—"}
        </code>
        <span className="text-xs text-muted">
          Ученик регистрируется, вводит этот код — и заявка приходит вам.
        </span>
      </Card>

      <div className="mb-6">
        <StudentForm />
      </div>

      <ListControls
        search={{ placeholder: "Имя, почта, телефон" }}
        filters={[
          {
            key: "status",
            label: "Любой статус",
            options: [
              { value: "", label: "Любой статус" },
              ...Object.entries(studentStatus).map(([value, m]) => ({
                value,
                label: m.label,
              })),
            ],
          },
        ]}
        sort={[
          { value: "name", label: "По имени" },
          { value: "recent", label: "Сначала новые" },
          { value: "status", label: "По статусу" },
        ]}
      />

      {students.length === 0 ? (
        <EmptyState>
          {all.length === 0
            ? "Пока никого нет — добавьте первого ученика."
            : "Под фильтры никто не подходит."}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2 text-left">
              <tr className="text-xs font-medium tracking-wide text-muted uppercase">
                <th className="px-4 py-3">Имя</th>
                <th className="px-4 py-3">Контакты</th>
                <th className="px-4 py-3">Вход</th>
                <th className="px-4 py-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border transition last:border-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/students/${s.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {s.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[s.email, s.phone, s.telegram].filter(Boolean).join(" · ") ||
                      "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {s.userId ? "Есть аккаунт" : "Нет входа"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge {...studentStatus[s.status]} />
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
