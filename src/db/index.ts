import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL не задан — смотри .env.example");
}

// Supabase отдаёт подключение через pgbouncer в transaction mode,
// где prepared statements не поддерживаются.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export { schema };
