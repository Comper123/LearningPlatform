/**
 * Наполняет систему тестовыми данными: курсы с программой, группы с
 * расписанием, учеников, проведённые и будущие занятия с посещаемостью,
 * домашние задания с проверкой и прогресс по темам.
 *
 * Запуск:  npx tsx scripts/seed.ts [email преподавателя]
 *
 * Ничего не удаляет. Повторный запуск отказывается работать, чтобы не
 * наплодить дублей — для перезаполнения удалите курсы вручную.
 */

import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

/**
 * Модули подключаются внутри main: `src/db` читает DATABASE_URL прямо при
 * импорте, поэтому сначала должен отработать dotenv выше.
 */
async function connect() {
  const [{ db }, schema, { planOccurrences }, { eq }] = await Promise.all([
    import("../src/db"),
    import("../src/db/schema"),
    import("../src/lib/schedule/plan"),
    import("drizzle-orm"),
  ]);

  return { db, schema, planOccurrences, eq };
}

/* --------------------------------------------------- детерминированный шум */

/** Свой генератор, чтобы данные были одинаковыми при каждом запуске. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20260828);
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];

/* ------------------------------------------------------------------- даты */

const MONDAY_OFFSET = (d: Date) => (d.getDay() + 6) % 7;

function mondayWeeksAgo(weeks: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - MONDAY_OFFSET(d) - weeks * 7);
  return d;
}

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------------- содержимое */

const COURSES = [
  {
    title: "Python с нуля",
    level: "Начальный",
    description: "Первый язык: от переменных до работы с файлами.",
    topics: [
      "Введение и первая программа",
      "Переменные и типы данных",
      "Условия и ветвление",
      "Циклы",
      "Списки и кортежи",
      "Словари и множества",
      "Функции",
      "Работа с файлами",
    ],
  },
  {
    title: "Веб-разработка: JavaScript",
    level: "Средний",
    description: "Вёрстка, язык браузера и первый интерактивный проект.",
    topics: [
      "HTML и структура страницы",
      "CSS и вёрстка",
      "Основы JavaScript",
      "DOM и события",
      "Асинхронность и fetch",
      "Мини-проект",
    ],
  },
];

/** Названия демо-групп вынесены сюда, чтобы `--clean` знал, что удалять. */
const DEMO_GROUP_TITLES = [
  "Python-1, будни",
  "Python-2, суббота",
  "JS-старт",
];

const STUDENT_NAMES = [
  "Иван Петров",
  "Мария Сидорова",
  "Артём Ковалёв",
  "Полина Новикова",
  "Дмитрий Ершов",
  "Анна Волкова",
  "Егор Лебедев",
  "София Морозова",
  "Кирилл Зайцев",
  "Алиса Громова",
  "Никита Соколов",
  "Вероника Белова",
];

const FEEDBACK = [
  "Работает верно, но код можно сократить — вынеси повтор в функцию.",
  "Отлично, всё чисто. Обрати внимание на именование переменных.",
  "Есть ошибка в граничном случае: пустой список ломает программу.",
  "Хорошо. В следующий раз добавь проверку ввода.",
];

/* ------------------------------------------------------------------- сид */

async function main() {
  const { db, schema, planOccurrences, eq } = await connect();
  const {
    assignments,
    attendance,
    courseRequests,
    courses,
    enrollments,
    groups,
    lessons,
    scheduleSlots,
    students,
    submissions,
    teacherProfiles,
    testAnswers,
    testAttempts,
    testGroups,
    testOptions,
    testQuestions,
    tests,
    topicProgress,
    topics,
    users,
  } = schema;

  // Флаги отбрасываем, чтобы `--force` не приняли за email преподавателя.
  const emailArg = process.argv
    .slice(2)
    .find((arg) => !arg.startsWith("--"))
    ?.trim()
    .toLowerCase();

  const teachers = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.role, "teacher"));

  if (teachers.length === 0) {
    throw new Error(
      "В базе нет преподавателя. Сначала зарегистрируйтесь в приложении.",
    );
  }

  const teacher = emailArg
    ? teachers.find((t) => t.email?.toLowerCase() === emailArg)
    : teachers[0];

  if (!teacher) {
    throw new Error(
      `Преподаватель ${emailArg} не найден. Есть: ${teachers
        .map((t) => t.email)
        .join(", ")}`,
    );
  }

  if (teachers.length > 1 && !emailArg) {
    throw new Error(
      `Преподавателей несколько — укажите email: ${teachers
        .map((t) => t.email)
        .join(", ")}`,
    );
  }

  if (process.argv.includes("--clean")) {
    const { and, inArray, like } = await import("drizzle-orm");

    // Удаляем только то, что создал этот скрипт: курсы и группы с точными
    // названиями и учеников с почтой @example.com. Остальное не трогаем.
    const removedStudents = await db
      .delete(students)
      .where(
        and(
          eq(students.teacherId, teacher.id),
          like(students.email, "%@example.com"),
        ),
      )
      .returning({ id: students.id });

    const removedGroups = await db
      .delete(groups)
      .where(
        and(
          eq(groups.teacherId, teacher.id),
          inArray(
            groups.title,
            DEMO_GROUP_TITLES as unknown as string[],
          ),
        ),
      )
      .returning({ id: groups.id });

    const removedCourses = await db
      .delete(courses)
      .where(
        and(
          eq(courses.teacherId, teacher.id),
          inArray(
            courses.title,
            COURSES.map((c) => c.title),
          ),
        ),
      )
      .returning({ id: courses.id });

    const removedTests = await db
      .delete(tests)
      .where(
        and(
          eq(tests.teacherId, teacher.id),
          inArray(tests.title, [
            "Python: переменные и типы",
            "JS: DOM и события",
          ]),
        ),
      )
      .returning({ id: tests.id });

    console.log(
      `Удалено: курсов ${removedCourses.length}, групп ${removedGroups.length}, ` +
        `учеников ${removedStudents.length}, тестов ${removedTests.length}`,
    );
    return;
  }

  const existing = await db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(eq(courses.teacherId, teacher.id));

  // Ничего не удаляем: данные только добавляются. Флаг нужен лишь чтобы
  // случайный повторный запуск не наплодил вторую копию курсов.
  if (existing.length > 0 && !process.argv.includes("--force")) {
    throw new Error(
      `У преподавателя уже есть курсы: ${existing
        .map((c) => `«${c.title}»`)
        .join(", ")}.\n` +
        "Добавить тестовые данные рядом: npx tsx scripts/seed.ts --force\n" +
        "Ничего существующего при этом не удаляется.",
    );
  }

  console.log(`Наполняю данные для ${teacher.email}\n`);

  /* --------------------------------------------------- профиль преподавателя */

  await db
    .insert(teacherProfiles)
    .values({
      userId: teacher.id,
      inviteCode: "DEMO-2026",
      headline: "Преподаватель Python и веб-разработки",
      bio: "Готовлю с нуля до первого проекта. Практика на каждом занятии, разбор кода лично.",
    })
    .onConflictDoUpdate({
      target: teacherProfiles.userId,
      set: {
        headline: "Преподаватель Python и веб-разработки",
        bio: "Готовлю с нуля до первого проекта. Практика на каждом занятии, разбор кода лично.",
      },
    });

  /* --------------------------------------------------- курсы и программа */

  const courseIds: string[] = [];
  const topicsByCourse = new Map<string, { id: string; title: string }[]>();

  for (const [ci, course] of COURSES.entries()) {
    const [created] = await db
      .insert(courses)
      .values({
        teacherId: teacher.id,
        title: course.title,
        level: course.level,
        description: course.description,
        // Первый курс — публичный, с открытой записью.
        isPublic: ci === 0,
        slug: ci === 0 ? "python-start" : null,
        enrollmentOpen: true,
      })
      .returning({ id: courses.id });

    courseIds.push(created.id);

    const createdTopics = await db
      .insert(topics)
      .values(
        course.topics.map((title, index) => ({
          courseId: created.id,
          title,
          position: index + 1,
        })),
      )
      .returning({ id: topics.id, title: topics.title });

    topicsByCourse.set(created.id, createdTopics);
    console.log(`Курс «${course.title}» — ${createdTopics.length} тем`);
  }

  /* ---------------------------------------------------------------- группы */

  const GROUPS = [
    {
      title: "Python-1, будни",
      courseId: courseIds[0],
      scheduleNote: "Пн, Ср 18:00",
      slots: [
        { weekday: 0, startTime: "18:00", durationMin: 90 },
        { weekday: 2, startTime: "18:00", durationMin: 90 },
      ],
    },
    {
      title: "Python-2, суббота",
      courseId: courseIds[0],
      scheduleNote: "Сб 11:00",
      slots: [{ weekday: 5, startTime: "11:00", durationMin: 120 }],
    },
    {
      title: "JS-старт",
      courseId: courseIds[1],
      scheduleNote: "Вт, Чт 19:00",
      slots: [
        { weekday: 1, startTime: "19:00", durationMin: 90 },
        { weekday: 3, startTime: "19:00", durationMin: 90 },
      ],
    },
  ];

  const groupIds: string[] = [];

  for (const group of GROUPS) {
    const [created] = await db
      .insert(groups)
      .values({
        teacherId: teacher.id,
        courseId: group.courseId,
        title: group.title,
        scheduleNote: group.scheduleNote,
        startsOn: dateKey(mondayWeeksAgo(6)),
        status: "active",
      })
      .returning({ id: groups.id });

    groupIds.push(created.id);

    await db
      .insert(scheduleSlots)
      .values(group.slots.map((slot) => ({ ...slot, groupId: created.id })));

    console.log(`Группа «${group.title}» — ${group.slots.length} слотов`);
  }

  /* --------------------------------------------------------------- ученики */

  const createdStudents = await db
    .insert(students)
    .values(
      STUDENT_NAMES.map((fullName, index) => {
        const [first] = fullName.split(" ");
        const latin = ["ivan", "maria", "artem", "polina", "dmitry", "anna",
          "egor", "sofia", "kirill", "alisa", "nikita", "veronika"][index];

        return {
          teacherId: teacher.id,
          fullName,
          email: `${latin}@example.com`,
          phone: `+7 900 ${100 + index}-${20 + index}-${30 + index}`,
          telegram: `@${latin}`,
          // Предпоследний на паузе, последний в архиве — чтобы было видно,
          // как выглядят разные статусы.
          status:
            index === STUDENT_NAMES.length - 2
              ? ("paused" as const)
              : index === STUDENT_NAMES.length - 1
                ? ("archived" as const)
                : ("active" as const),
          notes:
            index % 4 === 0
              ? `${first} занимается с интересом, нужен темп повыше.`
              : null,
        };
      }),
    )
    .returning({ id: students.id, fullName: students.fullName });

  console.log(`Учеников: ${createdStudents.length}`);

  // Ещё одна карточка — необработанная заявка на зачисление.
  await db.insert(students).values({
    teacherId: teacher.id,
    fullName: "Глеб Ушаков",
    email: "gleb@example.com",
    status: "pending",
  });
  console.log("Заявка на зачисление: 1");

  /* ------------------------------------------------------------- зачисление */

  const active = createdStudents.slice(0, 10);
  const membership = [
    active.slice(0, 4), // Python-1
    active.slice(4, 7), // Python-2
    active.slice(7, 10), // JS
  ];

  for (const [index, groupId] of groupIds.entries()) {
    await db.insert(enrollments).values(
      membership[index].map((student) => ({
        groupId,
        studentId: student.id,
      })),
    );
  }

  /* --------------------------------------------- занятия и посещаемость */

  const start = mondayWeeksAgo(6);
  const now = new Date();
  let lessonCount = 0;
  let markCount = 0;

  for (const [index, groupId] of groupIds.entries()) {
    const group = GROUPS[index];
    const courseTopics = topicsByCourse.get(group.courseId) ?? [];

    // 6 недель назад + 4 недели вперёд.
    const occurrences = planOccurrences(group.slots, start, 10);

    const rows = occurrences.map((occurrence, i) => {
      const topic = courseTopics[i];
      const past = occurrence.startsAt < now;

      return {
        groupId,
        startsAt: occurrence.startsAt,
        durationMin: occurrence.durationMin,
        topicId: topic?.id ?? null,
        title: topic?.title ?? `Занятие ${i + 1}`,
        status: past ? ("done" as const) : ("planned" as const),
        summary: past ? "Разобрали теорию, решили задачи из практикума." : null,
        content: past
          ? `## План\n\n1. Повторение прошлой темы\n2. ${topic?.title ?? "Новый материал"}\n3. Практика\n\n\`\`\`python\n# пример с занятия\nfor i in range(5):\n    print(i * i)\n\`\`\`\n\n**Дома:** задачи 1–5 из практикума.`
          : null,
      };
    });

    const created = await db
      .insert(lessons)
      .values(rows)
      .returning({ id: lessons.id, startsAt: lessons.startsAt });

    lessonCount += created.length;

    const past = created.filter((lesson) => lesson.startsAt < now);
    const marks: {
      lessonId: string;
      studentId: string;
      status: "present" | "absent" | "late" | "excused";
    }[] = [];

    for (const lesson of past) {
      for (const [studentIndex, student] of membership[index].entries()) {
        // Второй ученик каждой группы — хронический прогульщик,
        // чтобы сводка посещаемости показывала разброс.
        const slacker = studentIndex === 1;
        const roll = random();

        const status = slacker
          ? roll < 0.45
            ? ("absent" as const)
            : roll < 0.6
              ? ("late" as const)
              : ("present" as const)
          : roll < 0.82
            ? ("present" as const)
            : roll < 0.9
              ? ("late" as const)
              : roll < 0.96
                ? ("excused" as const)
                : ("absent" as const);

        marks.push({ lessonId: lesson.id, studentId: student.id, status });
      }
    }

    if (marks.length > 0) {
      await db.insert(attendance).values(marks);
      markCount += marks.length;
    }
  }

  console.log(`Занятий: ${lessonCount}, отметок посещаемости: ${markCount}`);

  /* ------------------------------------------------- домашние задания */

  let assignmentCount = 0;
  let submissionCount = 0;

  for (const [index, groupId] of groupIds.entries()) {
    const group = GROUPS[index];
    const courseTopics = topicsByCourse.get(group.courseId) ?? [];

    const specs = [
      { title: "Калькулятор на функциях", offsetDays: -18, maxScore: 100 },
      { title: "Разбор строк из файла", offsetDays: -5, maxScore: 100 },
      { title: "Мини-проект недели", offsetDays: 6, maxScore: 50 },
    ];

    for (const [specIndex, spec] of specs.entries()) {
      const dueAt = new Date(now);
      dueAt.setDate(now.getDate() + spec.offsetDays);
      dueAt.setHours(23, 59, 0, 0);

      const [assignment] = await db
        .insert(assignments)
        .values({
          teacherId: teacher.id,
          groupId,
          topicId: courseTopics[specIndex + 2]?.id ?? null,
          title: spec.title,
          description:
            "Решение выложите в репозиторий и пришлите ссылку. " +
            "Код должен запускаться без правок.",
          dueAt,
          maxScore: spec.maxScore,
        })
        .returning({ id: assignments.id });

      assignmentCount++;

      const overdue = spec.offsetDays < 0;

      const rows = membership[index].map((student) => {
        const roll = random();

        // Просроченное задание уже проверено, будущее только выдано.
        if (!overdue) {
          return {
            assignmentId: assignment.id,
            studentId: student.id,
            status: "assigned" as const,
          };
        }

        if (roll < 0.15) {
          return {
            assignmentId: assignment.id,
            studentId: student.id,
            status: "assigned" as const,
          };
        }

        const submittedAt = new Date(dueAt);
        submittedAt.setHours(20, 0, 0, 0);

        if (roll < 0.35) {
          return {
            assignmentId: assignment.id,
            studentId: student.id,
            status: "submitted" as const,
            url: `https://github.com/example/${student.id.slice(0, 6)}`,
            submittedAt,
          };
        }

        if (roll < 0.5) {
          return {
            assignmentId: assignment.id,
            studentId: student.id,
            status: "redo" as const,
            url: `https://github.com/example/${student.id.slice(0, 6)}`,
            submittedAt,
            reviewedAt: now,
            feedback: "Не проходит на пустом вводе — поправь и присылай снова.",
          };
        }

        return {
          assignmentId: assignment.id,
          studentId: student.id,
          status: "reviewed" as const,
          url: `https://github.com/example/${student.id.slice(0, 6)}`,
          submittedAt,
          reviewedAt: now,
          score: Math.round(spec.maxScore * (0.6 + random() * 0.4)),
          feedback: pick(FEEDBACK),
        };
      });

      await db.insert(submissions).values(rows);
      submissionCount += rows.length;
    }
  }

  console.log(`Заданий: ${assignmentCount}, работ: ${submissionCount}`);

  /* -------------------------------------------------- прогресс по темам */

  const progressRows: {
    studentId: string;
    topicId: string;
    level: number;
  }[] = [];

  for (const [index, group] of GROUPS.entries()) {
    const courseTopics = topicsByCourse.get(group.courseId) ?? [];

    for (const student of membership[index]) {
      // Оцениваем только пройденные темы — первые четыре.
      for (const topic of courseTopics.slice(0, 4)) {
        progressRows.push({
          studentId: student.id,
          topicId: topic.id,
          level: 2 + Math.floor(random() * 4),
        });
      }
    }
  }

  if (progressRows.length > 0) {
    await db.insert(topicProgress).values(progressRows);
  }

  console.log(`Оценок прогресса: ${progressRows.length}`);

  /* -------------------------------------------------------------- тесты */

  const TESTS = [
    {
      title: "Python: переменные и типы",
      timeLimitMin: 15,
      groupIdx: 0,
      questions: [
        { type: "single" as const, prompt: "Что выведет print(type(5))?", points: 1, options: ["*<class 'int'>", "<class 'float'>", "int", "number"] },
        { type: "single" as const, prompt: "Как объявить строку?", points: 1, options: ["*s = \"текст\"", "s := текст", "string s = текст"] },
        { type: "multiple" as const, prompt: "Какие значения — истинны (truthy)?", points: 2, options: ["*1", "*\"a\"", "0", "[]", "None"] },
        { type: "text" as const, prompt: "Чем список отличается от кортежа?", points: 3, options: [] },
      ],
    },
    {
      title: "JS: DOM и события",
      timeLimitMin: 20,
      groupIdx: 2,
      questions: [
        { type: "single" as const, prompt: "Как найти элемент по id 'app'?", points: 1, options: ["*document.getElementById('app')", "document.query('#app')", "$('app')"] },
        { type: "single" as const, prompt: "Какое событие — клик мышью?", points: 1, options: ["*click", "onpress", "tap"] },
        { type: "multiple" as const, prompt: "Что относится к методам массива?", points: 2, options: ["*map", "*filter", "each", "loop"] },
      ],
    },
  ];

  let testCount = 0;
  let attemptCount = 0;

  for (const spec of TESTS) {
    const [test] = await db
      .insert(tests)
      .values({
        teacherId: teacher.id,
        title: spec.title,
        description: "Демо-тест для проверки раздела аналитики.",
        timeLimitMin: spec.timeLimitMin,
        status: "published",
      })
      .returning({ id: tests.id });

    testCount++;
    await db.insert(testGroups).values({ testId: test.id, groupId: groupIds[spec.groupIdx] });

    const createdQuestions: {
      id: string;
      type: string;
      points: number;
      correct: string[];
      wrong: string[];
    }[] = [];

    for (const [qi, q] of spec.questions.entries()) {
      const [question] = await db
        .insert(testQuestions)
        .values({ testId: test.id, type: q.type, prompt: q.prompt, points: q.points, position: qi + 1 })
        .returning({ id: testQuestions.id });

      const correct: string[] = [];
      const wrong: string[] = [];
      if (q.options.length > 0) {
        const opts = await db
          .insert(testOptions)
          .values(
            q.options.map((line, oi) => ({
              questionId: question.id,
              text: line.replace(/^\*/, ""),
              isCorrect: line.startsWith("*"),
              position: oi + 1,
            })),
          )
          .returning({ id: testOptions.id, isCorrect: testOptions.isCorrect });
        for (const o of opts) (o.isCorrect ? correct : wrong).push(o.id);
      }

      createdQuestions.push({ id: question.id, type: q.type, points: q.points, correct, wrong });
    }

    // Часть учеников группы прошли тест.
    const maxScore = spec.questions.reduce((s, q) => s + q.points, 0);

    for (const student of membership[spec.groupIdx]) {
      if (random() < 0.35) continue; // не все успели

      const startedAt = new Date(now.getTime() - (1 + random() * 5) * 86400000);
      let autoScore = 0;
      let needsReview = false;

      const answerRows = createdQuestions.map((q) => {
        if (q.type === "text") {
          needsReview = true;
          return {
            questionId: q.id,
            optionIds: [] as string[],
            text: "Список изменяемый, кортеж — нет.",
            isCorrect: null as boolean | null,
            awardedPoints: null as number | null,
          };
        }
        // 75% верно; неверный ответ — реально выбранный неправильный вариант
        const ok = random() < 0.75;
        const chosen = ok
          ? q.correct
          : q.wrong.length
            ? [q.wrong[Math.floor(random() * q.wrong.length)]]
            : q.correct.slice(0, 1);
        if (ok) autoScore += q.points;
        return {
          questionId: q.id,
          optionIds: chosen,
          text: null,
          isCorrect: ok,
          awardedPoints: ok ? q.points : 0,
        };
      });

      const [attempt] = await db
        .insert(testAttempts)
        .values({
          testId: test.id,
          studentId: student.id,
          startedAt,
          expiresAt: new Date(startedAt.getTime() + spec.timeLimitMin * 60000),
          submittedAt: new Date(startedAt.getTime() + (5 + random() * 8) * 60000),
          autoSubmitted: random() < 0.2,
          autoScore,
          maxScore,
          score: needsReview ? null : autoScore,
        })
        .returning({ id: testAttempts.id });

      await db.insert(testAnswers).values(
        answerRows.map((a) => ({ ...a, attemptId: attempt.id })),
      );
      attemptCount++;
    }
  }

  console.log(`Тестов: ${testCount}, попыток: ${attemptCount}`);

  /* --------------------------------------------- заявки на публичный курс */

  // Двое «свободных» учеников подали заявку на публичный курс.
  const freeStudents = await db
    .insert(students)
    .values([
      { teacherId: teacher.id, fullName: "Тимур Хабиров", email: "timur@example.com", status: "pending" as const },
      { teacherId: teacher.id, fullName: "Ольга Кравец", email: "olga@example.com", status: "pending" as const },
    ])
    .returning({ id: students.id });

  await db.insert(courseRequests).values(
    freeStudents.map((s) => ({
      courseId: courseIds[0],
      studentId: s.id,
      message: "Хочу с нуля, свободного времени — вечера будни.",
    })),
  );

  console.log(`Заявок на курс: ${freeStudents.length}`);

  console.log("\nГотово.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nОшибка:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
