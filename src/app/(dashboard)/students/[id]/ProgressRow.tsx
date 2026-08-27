import { setTopicLevel } from "@/lib/progress/actions";

const levels = [0, 1, 2, 3, 4, 5];

/**
 * Шкала 0–5 кнопками: каждая кнопка — отдельная форма, поэтому
 * оценка ставится в один клик без клиентского состояния.
 */
export function ProgressRow({
  studentId,
  topicId,
  topicTitle,
  courseTitle,
  level,
}: {
  studentId: string;
  topicId: string;
  topicTitle: string;
  courseTitle: string;
  level: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm">{topicTitle}</p>
        <p className="mt-0.5 text-xs text-muted">{courseTitle}</p>
      </div>

      <div className="flex gap-1">
        {levels.map((value) => (
          <form key={value} action={setTopicLevel}>
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="topicId" value={topicId} />
            <input type="hidden" name="level" value={value} />
            <button
              type="submit"
              title={`Уровень ${value}`}
              className={`h-7 w-7 rounded-md text-xs transition ${
                level === value
                  ? "bg-accent text-accent-fg"
                  : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {value}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
