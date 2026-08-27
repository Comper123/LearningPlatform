import { relations } from "drizzle-orm";
import {
  date,
  index,
  integer,
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
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("courses_teacher_idx").on(t.teacherId)],
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
