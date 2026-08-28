CREATE TYPE "public"."course_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "course_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "course_request_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "enrollment_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "course_requests" ADD CONSTRAINT "course_requests_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_requests" ADD CONSTRAINT "course_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_requests_unique" ON "course_requests" USING btree ("course_id","student_id");--> statement-breakpoint
CREATE INDEX "course_requests_course_idx" ON "course_requests" USING btree ("course_id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_slug_unique" UNIQUE("slug");