import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { initializeOAuthUser, verifyPassword } from "@/lib/registration";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      // Один и тот же email через пароль и через Google — один аккаунт.
      // Безопасно, потому что Google подтверждает владение адресом.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        return verifyPassword(email, password);
      },
    }),
  ],
  // Credentials несовместим с сессиями в БД — сессия живёт в JWT,
  // а роль на каждый запрос читается из базы, чтобы не устаревала.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  events: {
    async createUser({ user }) {
      if (user.id) await initializeOAuthUser(user.id, user.email);
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      const id = token.sub;
      if (!id) return session;

      const [row] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      session.user.id = id;
      session.user.role = row?.role ?? "pending";
      return session;
    },
  },
});
