import Link from "next/link";
import { notFound } from "next/navigation";

import { getCourseOverview } from "@/lib/courses/teacher-workspace";
import { requireTeacher } from "@/lib/session";

import { CourseNav } from "./CourseNav";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const data = await getCourseOverview(teacher.id, id);

  if (!data) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link
          href="/courses"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Курсы
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {data.course.title}
        </h1>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[168px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <CourseNav
            courseId={id}
            badges={{
              homework: data.stats.hwPending,
              students: data.stats.openRequests,
            }}
          />
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
