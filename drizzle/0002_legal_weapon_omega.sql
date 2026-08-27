-- ALTER TYPE ... ADD VALUE нельзя использовать в той же транзакции, а мигратор
-- гонит все миграции одной транзакцией. Поэтому пересоздаём тип целиком:
-- значения только что созданного типа использовать в этой же транзакции можно.
-- Проверка на существование делает миграцию безопасной при повторном запуске.
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_enum e
		JOIN pg_type t ON t.oid = e.enumtypid
		WHERE t.typname = 'user_role' AND e.enumlabel = 'pending'
	) THEN
		ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;
		ALTER TYPE "public"."user_role" RENAME TO "user_role_old";
		CREATE TYPE "public"."user_role" AS ENUM('pending', 'teacher', 'student');
		ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role"
			USING "role"::text::"public"."user_role";
		ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'pending';
		DROP TYPE "public"."user_role_old";
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password_hash" text;
