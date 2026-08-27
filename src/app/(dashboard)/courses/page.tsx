import Link from "next/link";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { listCourses } from "@/lib/courses/queries";
import { requireTeacher } from "@/lib/session";

import { CourseForm } from "./CourseForm";

export default async function CoursesPage() {
  const teacher = await requireTeacher();
  const courses = await listCourses(teacher.id);

  return (
    <>
      <PageHeader title="Курсы" description="Программы обучения и их темы" />

      <div className="mb-6">
        <CourseForm />
      </div>

      {courses.length === 0 ? (
        <EmptyState>
          Курсов пока нет. Создайте курс и разбейте его на темы — по ним потом
          отслеживается прогресс учеников.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="h-full p-5 transition hover:border-accent">
                <h2 className="font-medium">{course.title}</h2>
                {course.level && (
                  <p className="mt-1 text-xs text-muted">{course.level}</p>
                )}
                {course.description && (
                  <p className="mt-3 line-clamp-3 text-sm text-muted">
                    {course.description}
                  </p>
                )}
                <p className="mt-4 text-xs text-muted">
                  Тем в программе: {course.topicCount}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
