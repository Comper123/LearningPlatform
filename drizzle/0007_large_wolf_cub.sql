CREATE TYPE "public"."question_type" AS ENUM('single', 'multiple', 'text');--> statement-breakpoint
CREATE TYPE "public"."test_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "test_answers" (
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"option_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"text" text,
	"is_correct" boolean,
	"awarded_points" smallint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_answers_attempt_id_question_id_pk" PRIMARY KEY("attempt_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "test_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"auto_submitted" boolean DEFAULT false NOT NULL,
	"auto_score" smallint,
	"score" smallint,
	"max_score" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_groups" (
	"test_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "test_groups_test_id_group_id_pk" PRIMARY KEY("test_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "test_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"type" "question_type" DEFAULT 'single' NOT NULL,
	"prompt" text NOT NULL,
	"points" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" text NOT NULL,
	"topic_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"time_limit_min" integer,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"reveal_answers" boolean DEFAULT true NOT NULL,
	"status" "test_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_question_id_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_groups" ADD CONSTRAINT "test_groups_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_groups" ADD CONSTRAINT "test_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_options" ADD CONSTRAINT "test_options_question_id_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "test_attempts_unique" ON "test_attempts" USING btree ("test_id","student_id");--> statement-breakpoint
CREATE INDEX "test_attempts_student_idx" ON "test_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "test_options_question_idx" ON "test_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "test_questions_test_idx" ON "test_questions" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "tests_teacher_idx" ON "tests" USING btree ("teacher_id");