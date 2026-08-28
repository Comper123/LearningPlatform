/** Помощники для фильтрации и сортировки списков в памяти. */

/** Нормализует строку для поиска: нижний регистр, ё→е. */
function norm(s: string) {
  return s.toLowerCase().replace(/ё/g, "е").trim();
}

/** Строка подходит под поисковый запрос (по любому из полей). */
export function matchesQuery(
  query: string | undefined,
  ...fields: (string | null | undefined)[]
) {
  if (!query) return true;
  const q = norm(query);
  return fields.some((f) => f && norm(f).includes(q));
}

export type Comparator<T> = (a: T, b: T) => number;

/** Выбирает компаратор по ключу сортировки из URL, иначе — запасной. */
export function pickSort<T>(
  sort: string | undefined,
  comparators: Record<string, Comparator<T>>,
  fallback: string,
): Comparator<T> {
  return comparators[sort ?? ""] ?? comparators[fallback];
}

export const text = (a: string, b: string) => a.localeCompare(b, "ru");
export const num = (a: number, b: number) => a - b;
export const date = (a: Date | null, b: Date | null) =>
  (a?.getTime() ?? 0) - (b?.getTime() ?? 0);
