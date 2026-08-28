import { eq } from "drizzle-orm";
import Link from "next/link";

import { Avatar } from "@/components/Avatar";
import { CopyButton } from "@/components/CopyButton";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getTeacherStats } from "@/lib/profile/queries";
import { ensureTeacherProfile } from "@/lib/registration";
import { requireTeacher } from "@/lib/session";

import { ProfileForm } from "./ProfileForm";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </Card>
  );
}

export default async function SettingsPage() {
  const teacher = await requireTeacher();

  const [profile, [account], stats] = await Promise.all([
    ensureTeacherProfile(teacher.id),
    db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, teacher.id))
      .limit(1),
    getTeacherStats(teacher.id),
  ]);

  const name = account?.name ?? "Преподаватель";

  return (
    <>
      <PageHeader title="Профиль" description="Как вас видят ученики" />

      <Card className="mb-6 flex flex-wrap items-center gap-4 p-5">
        <Avatar name={name} size={64} />
        <div className="min-w-0">
          <p className="text-lg font-semibold">{name}</p>
          {profile?.headline && (
            <p className="text-sm text-muted">{profile.headline}</p>
          )}
          <p className="mt-0.5 text-xs text-muted">{account?.email} · преподаватель</p>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Учеников" value={stats.students} />
        <Stat label="Групп" value={stats.groups} />
        <Stat label="Курсов" value={stats.courses} />
        <Stat label="Публичных" value={stats.publicCourses} />
      </div>

      <Card className="mb-6 flex flex-wrap items-center gap-3 p-4 text-sm">
        <span className="text-muted">Код приглашения:</span>
        <code className="rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-base tracking-widest">
          {profile?.inviteCode ?? "—"}
        </code>
        {profile?.inviteCode && (
          <CopyButton value={profile.inviteCode} label="Копировать код" />
        )}
        {stats.publicCourse?.slug && (
          <Link
            href={`/c/${stats.publicCourse.slug}`}
            className="ml-auto text-accent hover:underline"
          >
            Открыть публичную страницу курса →
          </Link>
        )}
      </Card>

      <h2 className="mb-3 font-medium">Редактировать</h2>
      <ProfileForm
        name={name}
        headline={profile?.headline ?? ""}
        bio={profile?.bio ?? ""}
      />
    </>
  );
}
