-- Приводит базу к состоянию миграций 0002 и 0003 напрямую, минуя drizzle-kit.
-- Выполнять в Supabase → SQL Editor. Запускать можно сколько угодно раз:
-- каждый блок проверяет, нужно ли что-то делать.
--
-- Зачем пересоздание типа, а не ALTER TYPE ... ADD VALUE: PostgreSQL не даёт
-- использовать только что добавленное значение enum до конца транзакции,
-- а значения типа, созданного в этой же транзакции, использовать можно.

-- Не ждать блокировку вечно: если таблицу держит зависшая сессия, скрипт
-- упадёт с внятной ошибкой через 5 секунд вместо бесконечного ожидания.
-- Тогда сначала выполните scripts/unblock-locks.sql.
SET lock_timeout = '5s';

-- 1. Роли пользователей: добавляется 'pending'.
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
END $$;

-- 2. Пароль для входа без Google.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password_hash" text;

-- 3. Статусы учеников: добавляются 'pending' и 'rejected' для заявок.
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

-- Проверка: должно вернуться 5 статусов ученика и 3 роли.
SELECT t.typname, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname IN ('student_status', 'user_role')
ORDER BY t.typname, e.enumsortorder;
