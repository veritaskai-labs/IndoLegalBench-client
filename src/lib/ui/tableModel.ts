export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection };
export type Comparator<T> = (a: T, b: T) => number;

const isEmpty = (value: unknown) => value === null || value === undefined;

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

/** First press sorts ascending; pressing the active column again flips the direction. */
export function nextSort(current: SortState | null, key: string): SortState {
  if (current?.key !== key) return { key, direction: "asc" };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

/**
 * Sorted copy of the rows. A column can bring its own comparator; otherwise the cell value is compared
 * (numbers by value, text ignoring case). Empty values always go last, whatever the direction.
 */
export function sortRows<T>(
  rows: readonly T[],
  sort: SortState | null,
  comparators: Readonly<Record<string, Comparator<T>>>,
): T[] {
  if (!sort) return [...rows];
  const sign = sort.direction === "asc" ? 1 : -1;
  const custom = comparators[sort.key];
  return [...rows].sort((a, b) => {
    if (custom) return sign * custom(a, b);
    const left = (a as Record<string, unknown>)[sort.key];
    const right = (b as Record<string, unknown>)[sort.key];
    if (isEmpty(left) || isEmpty(right)) return Number(isEmpty(left)) - Number(isEmpty(right));
    return sign * compareValues(left, right);
  });
}

export type Paged<T> = { items: T[]; page: number; lastPage: number; total: number };

/** One page of the rows. An out-of-range page is clamped so the table never shows nothing by accident. */
export function paginate<T>(rows: readonly T[], page: number, pageSize: number): Paged<T> {
  if (pageSize < 1) throw new RangeError("pageSize must be at least 1");
  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), lastPage);
  const start = (current - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize), page: current, lastPage, total: rows.length };
}
