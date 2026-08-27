import { Button, Card } from "@/components/ui";
import { approveRequest, rejectRequest } from "@/lib/students/actions";

type Request = {
  id: string;
  fullName: string;
  email: string | null;
  createdAt: Date;
};

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function RequestList({ requests }: { requests: Request[] }) {
  if (requests.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-medium">
        Заявки на зачисление ({requests.length})
      </h2>

      <Card className="divide-y divide-border">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{request.fullName}</p>
              <p className="mt-0.5 text-xs text-muted">
                {request.email ?? "без email"} ·{" "}
                {dateFormat.format(request.createdAt)}
              </p>
            </div>

            <div className="flex gap-2">
              <form action={approveRequest}>
                <input type="hidden" name="id" value={request.id} />
                <Button type="submit">Принять</Button>
              </form>

              <form action={rejectRequest}>
                <input type="hidden" name="id" value={request.id} />
                <Button type="submit" variant="ghost">
                  Отклонить
                </Button>
              </form>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}
