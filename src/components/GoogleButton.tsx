import { signIn } from "@/auth";

/** Вход через Google. Куда попадёт человек дальше, решает роль. */
export function GoogleButton({ redirectTo = "/" }: { redirectTo?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo });
      }}
    >
      <button
        type="submit"
        className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-background"
      >
        Продолжить с Google
      </button>
    </form>
  );
}
