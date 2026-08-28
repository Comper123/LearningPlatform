import { notFound } from "next/navigation";

import { getCourse } from "@/lib/courses/queries";
import { requireTeacher } from "@/lib/session";

import { PublishPanel } from "../PublishPanel";

export default async function CoursePublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const course = await getCourse(teacher.id, id);
  if (!course) notFound();

  return (
    <>
      <h2 className="mb-1 font-medium">Публикация курса</h2>
      <p className="mb-4 text-sm text-muted">
        Публичный курс виден в каталоге и по прямой ссылке. Ученики могут
        оставить заявку на запись — вы одобряете её во вкладке «Ученики».
      </p>

      <PublishPanel
        courseId={course.id}
        isPublic={course.isPublic}
        slug={course.slug}
        enrollmentOpen={course.enrollmentOpen}
      />
    </>
  );
}
