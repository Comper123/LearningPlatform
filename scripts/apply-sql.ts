/**
 * Выполняет SQL-файл напрямую, минуя drizzle-kit.
 * Пригодится, когда `db:migrate` виснет на пулере Supabase.
 *
 * Запуск:  npx tsx scripts/apply-sql.ts drizzle/0004_known_captain_universe.sql
 *
 * Учёт применённых миграций при этом не ведётся — если нужно, чтобы
 * drizzle считал файл применённым, добавьте запись в drizzle.__drizzle_migrations.
 */

import { readFileSync } from "node:fs";

import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Укажите путь к .sql файлу");

  const [{ db }, { sql }] = await Promise.all([
    import("../src/db"),
    import("drizzle-orm"),
  ]);

  const statements = readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`${file}: ${statements.length} выражений`);

  for (const [index, statement] of statements.entries()) {
    const preview = statement.replace(/\s+/g, " ").slice(0, 70);
    process.stdout.write(`  ${index + 1}. ${preview}… `);

    const result = await db.execute(sql.raw(statement));
    const rows = Array.isArray(result) ? result : [];

    console.log("ок");
    if (rows.length > 0) console.table(rows);
  }

  console.log("Готово.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nОшибка:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
