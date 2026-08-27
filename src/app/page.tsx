import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { homePathFor } from "@/lib/session";

export default async function Home() {
  const session = await auth();

  redirect(session?.user ? homePathFor(session.user.role) : "/login");
}
