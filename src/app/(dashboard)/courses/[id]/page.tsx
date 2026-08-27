import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, EmptyState, IconButton, PageHeader } from "@/components/ui";
import { deleteTopic, moveTopic } from "@/lib/courses/actions";
import { getCourse, listCourseGroups, listTopics } from "@/lib/courses/queries";
import { requireTeacher } from "@/lib/session";

import { TopicForm } from "./TopicForm";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const course = await getCourse(teacher.id, id);

  if (!course) notFound();

  const [topics, courseGroups] = await Promise.all([
    listTopics(course.id),
    listCourseGroups(course.id),
  ]);

  return (
    <>
      <Link href="/courses" className="text-sm text-muted hover:text-foreground">
        ← Все курсы
      </Link>

      <div className="mt-3">
        <PageHeader
          title={course.title}
          description={[course.level, course.description]
            .filter(Boolean)
            .join(" · ")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-medium">Программа курса</h2>
          </div>

          <div className="mb-4">
            <TopicForm courseId={course.id} />
          </div>

          {topics.length === 0 ? (
            <EmptyState>Тем пока нет — добавьте первую.</EmptyState>
          ) : (
            <ol className="grid gap-2">
              {topics.map((topic, index) => (
                <li key={topic.id}>
                  <Card className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 w-6 shrink-0 text-sm text-muted">
                      {index + 1}.
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{topic.title}</p>
                      {topic.description && (
                        <p className="mt-1 text-sm text-muted">
                          {topic.description}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <MoveButton
                        courseId={course.id}
                        topicId={topic.id}
                        direction="up"
                        disabled={index === 0}
                        label="↑"
                      />
                      <MoveButton
                        courseId={course.id}
                        topicId={topic.id}
                        direction="down"
                        disabled={index === topics.length - 1}
                        label="↓"
                      />
                      <form action={deleteTopic}>
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="topicId" value={topic.id} />
                        <IconButton
                          type="submit"
                          title="Удалить тему"
                          className="hover:text-danger"
                        >
                          ✕
                        </IconButton>
                      </form>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-medium">Группы по курсу</h2>
          {courseGroups.length === 0 ? (
            <EmptyState>Ни одна группа не учится по этому курсу.</EmptyState>
          ) : (
            <Card className="divide-y divide-border">
              {courseGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="block px-4 py-3 text-sm transition hover:text-accent"
                >
                  {group.title}
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </>
  );
}

function MoveButton({
  courseId,
  topicId,
  direction,
  disabled,
  label,
}: {
  courseId: string;
  topicId: string;
  direction: "up" | "down";
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={moveTopic}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="direction" value={direction} />
      <IconButton type="submit" disabled={disabled}>
        {label}
      </IconButton>
    </form>
  );
}
