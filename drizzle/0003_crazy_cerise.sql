-- Пересоздаём тип вместо ALTER TYPE ... ADD VALUE — см. комментарий в 0002.
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e
		JOIN pg_type t ON t.oid = e.enumtypid
		WHERE t.typname = 'student_status' AND e.enumlabel = 'pending'
	) THEN
		ALTER TABLE "students" ALTER COLUMN "status" DROP DEFAULT;
		ALTER TYPE "public"."student_status" RENAME TO "student_status_old";
		CREATE TYPE "public"."student_status" AS ENUM('pending', 'rejected', 'active', 'paused', 'archived');
		ALTER TABLE "students" ALTER COLUMN "status" TYPE "public"."student_status"
			USING "status"::text::"public"."student_status";
		ALTER TABLE "students" ALTER COLUMN "status" SET DEFAULT 'active';
		DROP TYPE "public"."student_status_old";
	END IF;
END $$;
