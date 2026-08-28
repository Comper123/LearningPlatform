/**
 * Добавляет один опубликованный тест с вопросами к первой группе
 * преподавателя — чтобы посмотреть раздел «Тесты» без полного пересида.
 *
 * Запуск: npx tsx scripts/seed-test.ts
 * Повторный запуск создаёт ещё один такой тест (дублей не проверяет).
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

async function main() {
  const [{ db }, schema, { eq }] = await Promise.all([
    import("../src/db"),
    import("../src/db/schema"),
    import("drizzle-orm"),
  ]);
  const { tests, testQuestions, testOptions, testGroups, users, groups } = schema;

  const [teacher] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "teacher"))
    .limit(1);
  if (!teacher) throw new Error("нет преподавателя");

  const [group] = await db
    .select({ id: groups.id, title: groups.title })
    .from(groups)
    .where(eq(groups.teacherId, teacher.id))
    .limit(1);
  if (!group) throw new Error("нет ни одной группы");

  const [test] = await db
    .insert(tests)
    .values({
      teacherId: teacher.id,
      title: "Разминка: основы Python",
      description: "Короткий тест на 10 минут. Можно вернуться, пока идёт время.",
      timeLimitMin: 10,
      revealAnswers: true,
      status: "published",
    })
    .returning({ id: tests.id });

  const QUESTIONS = [
    {
      type: "single" as const,
      prompt: "Что выведет print(2 ** 3)?",
      points: 1,
      options: [
        { text: "8", correct: true },
        { text: "6", correct: false },
        { text: "9", correct: false },
      ],
    },
    {
      type: "multiple" as const,
      prompt: "Какие значения истинны (truthy) в Python?",
      points: 2,
      options: [
        { text: "1", correct: true },
        { text: "\"текст\"", correct: true },
        { text: "0", correct: false },
        { text: "[]", correct: false },
      ],
    },
    {
      type: "single" as const,
      prompt: "Каким ключевым словом объявляют функцию?",
      points: 1,
      options: [
        { text: "def", correct: true },
        { text: "func", correct: false },
        { text: "function", correct: false },
      ],
    },
    {
      type: "text" as const,
      prompt: "Своими словами: чем список отличается от кортежа?",
      points: 3,
      options: [],
    },
  ];

  for (const [i, q] of QUESTIONS.entries()) {
    const [question] = await db
      .insert(testQuestions)
      .values({
        testId: test.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        position: i + 1,
      })
      .returning({ id: testQuestions.id });

    if (q.options.length > 0) {
      await db.insert(testOptions).values(
        q.options.map((o, j) => ({
          questionId: question.id,
          text: o.text,
          isCorrect: o.correct,
          position: j + 1,
        })),
      );
    }
  }

  await db.insert(testGroups).values({ testId: test.id, groupId: group.id });

  console.log(
    `Тест «Разминка: основы Python» создан и назначен группе «${group.title}».`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("Ошибка:", e instanceof Error ? e.message : e);
  process.exit(1);
});
