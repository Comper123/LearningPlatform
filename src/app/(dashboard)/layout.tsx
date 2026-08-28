import { signOut } from "@/auth";
import { TeacherTopNav } from "@/components/TeacherTopNav";
import { requireTeacher } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTeacher();

  return (
    <div className="flex min-h-screen flex-col">
      <TeacherTopNav
        signOutButton={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
            >
              Выйти
            </button>
          </form>
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
