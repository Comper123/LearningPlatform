import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Работа с Supabase Storage.
 *
 * Ходим сервисным ключом только с сервера: бакет закрытый, ссылки на файлы
 * выдаются подписанные и на время. Поэтому ключ не должен попасть в браузер —
 * отсюда `server-only` сверху.
 *
 * Если переменные не заданы, загрузка просто выключена: остальная система
 * работает, а форма сдачи не покажет поле файла.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const STORAGE_BUCKET = process.env.SUPABASE_BUCKET ?? "submissions";

/** Максимальный размер вложения: презентации и датасеты в это укладываются. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const storageEnabled = Boolean(url && serviceKey);

function client() {
  if (!url || !serviceKey) {
    throw new Error(
      "Хранилище не настроено: задайте NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/** Оставляет в имени только безопасные символы, сохраняя расширение. */
function safeName(name: string) {
  const cleaned = name
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-80);

  return cleaned || "file";
}

/**
 * Кладёт файл в бакет по пути `<префикс>/<время>-<имя>`.
 * Возвращает путь внутри бакета — его и храним в базе.
 */
export async function uploadFile(prefix: string, file: File) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Файл больше 20 МБ");
  }

  const path = `${prefix}/${Date.now()}-${safeName(file.name)}`;

  const { error } = await client()
    .storage.from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw new Error(`Не удалось загрузить файл: ${error.message}`);

  return {
    path,
    name: file.name,
    size: file.size,
    mimeType: file.type || null,
  };
}

/** Работа ученика: `submissions/<задание>/<ученик>/…` */
export function submissionPrefix(assignmentId: string, studentId: string) {
  return `submissions/${assignmentId}/${studentId}`;
}

/** Материалы занятия: `lessons/<занятие>/…` */
export function lessonPrefix(lessonId: string) {
  return `lessons/${lessonId}`;
}


/**
 * Временная ссылка на скачивание. По умолчанию на час.
 * Если хранилище не настроено — возвращает null, а не падает: старые
 * вложения не должны ломать страницу проверки.
 */
export async function signedUrl(path: string, expiresInSeconds = 3600) {
  if (!storageEnabled) return null;

  const { data, error } = await client()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) return null;
  return data.signedUrl;
}

export async function removeFile(path: string) {
  await client().storage.from(STORAGE_BUCKET).remove([path]);
}
