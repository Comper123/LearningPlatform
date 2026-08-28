import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

/* ------------------------------------------------------------------ enums */

export const studentStatusEnum = pgEnum("student_status", [
  "pending", // записался сам по коду, ждёт решения преподавателя
  "rejected", // заявку отклонили
  "active", // учится
  "paused", // академ / пауза
  "archived", // закончил или ушёл
]);

export const groupStatusEnum = pgEnum("group_status", [
  "planned",
  "active",
  "finished",
]);

export const lessonStatusEnum = pgEnum("lesson_status", [
  "planned",
  "done",
  "cancelled",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused", // отсутствовал по уважительной причине
]);

export const testStatusEnum = pgEnum("test_status", ["draft", "published"]);

export const questionTypeEnum = pgEnum("question_type", [
  "single", // один верный вариант
  "multiple", // несколько верных вариантов
  "text", // свободный ответ, проверяет преподаватель
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "assigned", // выдано, ученик ещё не сдал
  "submitted", // сдано, ждёт проверки
  "reviewed", // проверено
  "redo", // на доработку
]);

/* --------------------------------------------------------------- students */

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * Преподаватель, за которым закреплён ученик. NULL — «свободный»
     * ученик: зарегистрировался сам без кода и ещё не записан ни на один
     * курс. Проставляется, когда преподаватель одобряет заявку на курс.
     */
    teacherId: text("teacher_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    /**
     * Аккаунт ученика, если он завёл вход. Пусто — карточку создал
     * преподаватель, а ученик ещё ни разу не заходил.
     */
    userId: text("user_id")
      .unique()
      .references(() => users.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    telegram: text("telegram"),
    birthDate: date("birth_date"),
    status: studentStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("students_teacher_idx").on(t.teacherId)],
);

/* ---------------------------------------------------------------- courses */

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    /** Например: "Python, начальный" */
    level: text("level"),
    /** Виден в публичном каталоге и по ссылке /c/<slug>. */
    isPublic: boolean("is_public").notNull().default(false),
    /** Кусок URL публичной страницы. Уникален среди публичных курсов. */
    slug: text("slug").unique(),
    /** Принимать ли заявки на запись прямо сейчас. */
    enrollmentOpen: boolean("enrollment_open").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("courses_teacher_idx").on(t.teacherId)],
);

export const courseRequestStatusEnum = pgEnum("course_request_status", [
  "pending",
  "approved",
  "rejected",
]);

/**
 * Заявка ученика на публичный курс. Одобряя её, преподаватель выбирает
 * группу, и появляется запись в `enrollments`.
 */
export const courseRequests = pgTable(
  "course_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: courseRequestStatusEnum("status").notNull().default("pending"),
    /** Необязательная записка от ученика. */
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("course_requests_unique").on(t.courseId, t.studentId),
    index("course_requests_course_idx").on(t.courseId),
  ],
);

/** Программа курса: упорядоченный список тем. */
export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("topics_course_idx").on(t.courseId, t.position)],
);

/* ----------------------------------------------------------------- groups */

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    /** Свободный текст: "Пн, Ср 18:00" */
    scheduleNote: text("schedule_note"),
    startsOn: date("starts_on"),
    status: groupStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("groups_teacher_idx").on(t.teacherId)],
);

/** Кто в какой группе учится. */
export const enrollments = pgTable(
  "enrollments",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.studentId] }),
    index("enrollments_student_idx").on(t.studentId),
  ],
);

/**
 * Регулярное расписание группы: «по вторникам в 18:00».
 * По этим слотам занятия расставляются автоматически на нужный период.
 * `scheduleNote` у группы остаётся свободной подписью для человека.
 */
export const scheduleSlots = pgTable(
  "schedule_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    /** 0 — понедельник, 6 — воскресенье. */
    weekday: smallint("weekday").notNull(),
    /** Время начала в виде "18:00". */
    startTime: text("start_time").notNull(),
    durationMin: integer("duration_min").notNull().default(90),
  },
  (t) => [index("schedule_slots_group_idx").on(t.groupId)],
);

/* ---------------------------------------------------------------- lessons */

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(90),
    status: lessonStatusEnum("status").notNull().default("planned"),
    /** Короткая строка «что разобрали» — видна в списках. */
    summary: text("summary"),
    /** Материалы занятия в Markdown: конспект, примеры кода, ссылки. */
    content: text("content"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("lessons_group_starts_idx").on(t.groupId, t.startsAt)],
);

/**
 * Материалы занятия: презентации, PDF, примеры кода, датасеты.
 * Сами файлы лежат в Supabase Storage, здесь — только путь и описание.
 */
export const lessonFiles = pgTable(
  "lesson_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    /** Путь внутри бакета. */
    path: text("path").notNull(),
    /** Исходное имя файла — его показываем и отдаём при скачивании. */
    name: text("name").notNull(),
    size: integer("size").notNull().default(0),
    mimeType: text("mime_type"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("lesson_files_lesson_idx").on(t.lessonId)],
);

export const attendance = pgTable(
  "attendance",
  {
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: attendanceStatusEnum("status").notNull().default("present"),
    note: text("note"),
  },
  (t) => [
    primaryKey({ columns: [t.lessonId, t.studentId] }),
    index("attendance_student_idx").on(t.studentId),
  ],
);

/* ------------------------------------------------------------ assignments */

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "cascade",
    }),
    topicId: uuid("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    maxScore: smallint("max_score").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("assignments_group_idx").on(t.groupId)],
);

export const submissions = pgTable(
  "submissions",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: submissionStatusEnum("status").notNull().default("assigned"),
    /** Ссылка на репозиторий / песочницу. */
    url: text("url"),
    /** Код, вставленный прямо в форму. */
    codeText: text("code_text"),
    /** Язык вставленного кода — для подписи блока. */
    codeLang: text("code_lang"),
    /** Прикреплённый файл в Supabase Storage: путь внутри бакета и имя. */
    filePath: text("file_path"),
    fileName: text("file_name"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    score: smallint("score"),
    feedback: text("feedback"),
  },
  (t) => [
    primaryKey({ columns: [t.assignmentId, t.studentId] }),
    index("submissions_student_idx").on(t.studentId),
  ],
);

/* ------------------------------------------------------------------ tests */

/**
 * Тест: набор вопросов с ограничением по времени и окном доступности.
 * Назначается на группы через `testGroups`.
 */
export const tests = pgTable(
  "tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    /** Лимит на прохождение в минутах. NULL — без ограничения. */
    timeLimitMin: integer("time_limit_min"),
    /** Окно доступности. Вне окна начать попытку нельзя. */
    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    /** Показывать ли ученику правильные ответы после сдачи. */
    revealAnswers: boolean("reveal_answers").notNull().default(true),
    status: testStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tests_teacher_idx").on(t.teacherId)],
);

export const testQuestions = pgTable(
  "test_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    type: questionTypeEnum("type").notNull().default("single"),
    prompt: text("prompt").notNull(),
    points: smallint("points").notNull().default(1),
  },
  (t) => [index("test_questions_test_idx").on(t.testId)],
);

export const testOptions = pgTable(
  "test_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => testQuestions.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (t) => [index("test_options_question_idx").on(t.questionId)],
);

/** Тест ↔ группа. */
export const testGroups = pgTable(
  "test_groups",
  {
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.testId, t.groupId] })],
);

/**
 * Попытка прохождения — одна на ученика и тест.
 * `submittedAt IS NULL` — попытка ещё идёт; к ней можно вернуться, пока
 * `now < expiresAt`. `expiresAt` фиксируется в момент старта.
 */
export const testAttempts = pgTable(
  "test_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** startedAt + лимит. NULL — теста без лимита времени. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    /** true — сдана по истечении времени, а не вручную. */
    autoSubmitted: boolean("auto_submitted").notNull().default(false),
    /** Автосумма по вопросам с автопроверкой. */
    autoScore: smallint("auto_score"),
    /** Финальный балл после проверки свободных ответов. */
    score: smallint("score"),
    maxScore: smallint("max_score").notNull().default(0),
  },
  (t) => [
    uniqueIndex("test_attempts_unique").on(t.testId, t.studentId),
    index("test_attempts_student_idx").on(t.studentId),
  ],
);

/**
 * Ответ на один вопрос. Сохраняется по ходу прохождения, поэтому при
 * возврате к тесту ученик видит уже отмеченное.
 */
export const testAnswers = pgTable(
  "test_answers",
  {
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => testAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => testQuestions.id, { onDelete: "cascade" }),
    /** Отмеченные варианты (id из testOptions). */
    optionIds: jsonb("option_ids").$type<string[]>().notNull().default([]),
    /** Текст свободного ответа. */
    text: text("text"),
    /** Проставляется при проверке: верен ли ответ и сколько баллов дал. */
    isCorrect: boolean("is_correct"),
    awardedPoints: smallint("awarded_points"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);

/* --------------------------------------------------------------- progress */

/** Уровень освоения темы учеником: 0 — не начата, 5 — уверенно владеет. */
export const topicProgress = pgTable(
  "topic_progress",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    level: smallint("level").notNull().default(0),
    comment: text("comment"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.studentId, t.topicId] }),
    uniqueIndex("topic_progress_unique").on(t.studentId, t.topicId),
  ],
);

/* -------------------------------------------------------------- relations */

export const studentsRelations = relations(students, ({ many }) => ({
  enrollments: many(enrollments),
  attendance: many(attendance),
  submissions: many(submissions),
  progress: many(topicProgress),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  topics: many(topics),
  groups: many(groups),
  requests: many(courseRequests),
}));

export const courseRequestsRelations = relations(courseRequests, ({ one }) => ({
  course: one(courses, {
    fields: [courseRequests.courseId],
    references: [courses.id],
  }),
  student: one(students, {
    fields: [courseRequests.studentId],
    references: [students.id],
  }),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  course: one(courses, {
    fields: [topics.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
  progress: many(topicProgress),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  course: one(courses, {
    fields: [groups.courseId],
    references: [courses.id],
  }),
  enrollments: many(enrollments),
  lessons: many(lessons),
  assignments: many(assignments),
  scheduleSlots: many(scheduleSlots),
}));

export const scheduleSlotsRelations = relations(scheduleSlots, ({ one }) => ({
  group: one(groups, {
    fields: [scheduleSlots.groupId],
    references: [groups.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  group: one(groups, {
    fields: [enrollments.groupId],
    references: [groups.id],
  }),
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  group: one(groups, {
    fields: [lessons.groupId],
    references: [groups.id],
  }),
  topic: one(topics, {
    fields: [lessons.topicId],
    references: [topics.id],
  }),
  attendance: many(attendance),
  files: many(lessonFiles),
}));

export const lessonFilesRelations = relations(lessonFiles, ({ one }) => ({
  lesson: one(lessons, {
    fields: [lessonFiles.lessonId],
    references: [lessons.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  lesson: one(lessons, {
    fields: [attendance.lessonId],
    references: [lessons.id],
  }),
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  group: one(groups, {
    fields: [assignments.groupId],
    references: [groups.id],
  }),
  topic: one(topics, {
    fields: [assignments.topicId],
    references: [topics.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(students, {
    fields: [submissions.studentId],
    references: [students.id],
  }),
}));

export const topicProgressRelations = relations(topicProgress, ({ one }) => ({
  student: one(students, {
    fields: [topicProgress.studentId],
    references: [students.id],
  }),
  topic: one(topics, {
    fields: [topicProgress.topicId],
    references: [topics.id],
  }),
}));

export const testsRelations = relations(tests, ({ one, many }) => ({
  topic: one(topics, {
    fields: [tests.topicId],
    references: [topics.id],
  }),
  questions: many(testQuestions),
  testGroups: many(testGroups),
  attempts: many(testAttempts),
}));

export const testQuestionsRelations = relations(
  testQuestions,
  ({ one, many }) => ({
    test: one(tests, {
      fields: [testQuestions.testId],
      references: [tests.id],
    }),
    options: many(testOptions),
  }),
);

export const testOptionsRelations = relations(testOptions, ({ one }) => ({
  question: one(testQuestions, {
    fields: [testOptions.questionId],
    references: [testQuestions.id],
  }),
}));

export const testGroupsRelations = relations(testGroups, ({ one }) => ({
  test: one(tests, { fields: [testGroups.testId], references: [tests.id] }),
  group: one(groups, { fields: [testGroups.groupId], references: [groups.id] }),
}));

export const testAttemptsRelations = relations(
  testAttempts,
  ({ one, many }) => ({
    test: one(tests, {
      fields: [testAttempts.testId],
      references: [tests.id],
    }),
    student: one(students, {
      fields: [testAttempts.studentId],
      references: [students.id],
    }),
    answers: many(testAnswers),
  }),
);

export const testAnswersRelations = relations(testAnswers, ({ one }) => ({
  attempt: one(testAttempts, {
    fields: [testAnswers.attemptId],
    references: [testAttempts.id],
  }),
  question: one(testQuestions, {
    fields: [testAnswers.questionId],
    references: [testQuestions.id],
  }),
}));
