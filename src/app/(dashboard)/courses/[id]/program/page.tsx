import { Card, EmptyState, IconButton } from "@/components/ui";
import { deleteTopic, moveTopic } from "@/lib/courses/actions";
import { listTopics } from "@/lib/courses/queries";
import { requireTeacher } from "@/lib/session";

import { TopicForm } from "../TopicForm";

export default async function CourseProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTeacher();
  const topics = await listTopics(id);

  return (
    <>
      <h2 className="mb-4 font-medium">Программа курса</h2>

      <div className="mb-4">
        <TopicForm courseId={id} />
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
                    <p className="mt-1 text-sm text-muted">{topic.description}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <MoveButton courseId={id} topicId={topic.id} direction="up" disabled={index === 0} label="↑" />
                  <MoveButton
                    courseId={id}
                    topicId={topic.id}
                    direction="down"
                    disabled={index === topics.length - 1}
                    label="↓"
                  />
                  <form action={deleteTopic}>
                    <input type="hidden" name="courseId" value={id} />
                    <input type="hidden" name="topicId" value={topic.id} />
                    <IconButton type="submit" title="Удалить тему" className="hover:text-danger">
                      ✕
                    </IconButton>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
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
