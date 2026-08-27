ALTER TABLE "lessons" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "code_text" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "code_lang" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "file_path" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "file_name" text;