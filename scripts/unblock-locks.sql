-- Диагностика «DDL висит»: ALTER TYPE / ALTER TABLE ждут эксклюзивную
-- блокировку таблицы, а её держит зависшая сессия.
-- Выполнять в Supabase → SQL Editor по шагам.

-- ШАГ 1. Кто сейчас в базе и что делает.
-- Ищите строки со state = 'idle in transaction' — это и есть виновники.
-- Столбец blocked_by показывает, кто кого держит.
SELECT
	pid,
	state,
	wait_event_type,
	wait_event,
	pg_blocking_pids(pid) AS blocked_by,
	now() - state_change   AS in_this_state,
	left(query, 100)       AS last_query
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
ORDER BY state_change;

-- ШАГ 2. Снять зависшие транзакции.
-- Перед этим остановите dev-сервер (Ctrl+C), иначе он тут же откроет новые.
-- Безопасно: незавершённые транзакции откатываются, данные не теряются.
SELECT pid, pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state IN ('idle in transaction', 'idle in transaction (aborted)');

-- ШАГ 3. Теперь выполните scripts/fix-enums.sql.
-- Он начинается с lock_timeout, поэтому при новой блокировке не повиснет,
-- а сразу сообщит об ошибке.
