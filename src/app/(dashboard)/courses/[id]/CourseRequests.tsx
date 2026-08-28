import { Button, Card } from "@/components/ui";
import { Select } from "@/components/Select";
import {
  approveCourseRequest,
  rejectCourseRequest,
} from "@/lib/courses/public-actions";

type Request = {
  id: string;
  studentName: string;
  message: string | null;
  createdAt: Date;
};

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
});

export function CourseRequests({
  requests,
  groups,
}: {
  requests: Request[];
  groups: { id: string; title: string }[];
}) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted">Новых заявок на курс нет.</p>
    );
  }

  return (
    <div className="grid gap-2">
      {requests.map((request) => (
        <Card key={request.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{request.studentName}</p>
              <p className="text-xs text-muted">
                {dateFormat.format(request.createdAt)}
              </p>
              {request.message && (
                <p className="mt-2 text-sm text-muted">{request.message}</p>
              )}
            </div>
          </div>

          {groups.length === 0 ? (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              Сначала создайте группу по этому курсу.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <form action={approveCourseRequest} className="flex items-end gap-2">
                <input type="hidden" name="requestId" value={request.id} />
                <label className="text-xs text-muted">
                  <span className="mb-1 block">Зачислить в группу</span>
                  <Select
                    name="groupId"
                    options={groups.map((g) => ({ value: g.id, label: g.title }))}
                    className="w-52"
                  />
                </label>
                <Button type="submit">Принять</Button>
              </form>

              <form action={rejectCourseRequest}>
                <input type="hidden" name="requestId" value={request.id} />
                <Button type="submit" variant="ghost">
                  Отклонить
                </Button>
              </form>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
