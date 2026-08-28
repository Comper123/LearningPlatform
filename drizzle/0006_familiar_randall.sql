CREATE TABLE "lesson_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"path" text NOT NULL,
	"name" text NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"mime_type" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_files" ADD CONSTRAINT "lesson_files_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_files_lesson_idx" ON "lesson_files" USING btree ("lesson_id");