/**
 * Форматирование без обращений к хранилищу: `storage.ts` помечен
 * `server-only`, а размер файла нужно показывать и в клиентских формах.
 */

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
