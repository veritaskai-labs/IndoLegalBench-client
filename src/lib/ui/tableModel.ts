export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection };
export type Comparator<T> = (a: T, b: T) => number;

const isEmpty = (value: unknown) => value === null || value === undefined;

// One collator for every comparison: building it per call made a 5,000 row text sort about 20 times slower.
const collator = new Intl.Collator(undefined, { sensitivity: "base" });

/** The API sends decimals as strings ("95.5"), so numeric text counts as a number. Blank text does not. */
function asNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareValues(a: unknown, b: unknown): number {
  const left = asNumber(a);
  const right = asNumber(b);
  if (left !== null && right !== null) return left - right;
  return collator.compare(String(a), String(b));
}

/** First press sorts ascending; pressing the active column again flips the direction. */
export function nextSort(current: SortState | null, key: string): SortState {
  if (current?.key !== key) return { key, direction: "asc" };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

/**
 * Sorted copy of the rows. A column can bring its own comparator; otherwise the cell value is compared
 * (numbers and numeric text by value, other text ignoring case). The value is the row field named by the
 * column key, or sortValues[key] for a derived column. Empty values always go last, whatever the direction.
 */
export function sortRows<T>(
  rows: readonly T[],
  sort: SortState | null,
  comparators: Readonly<Record<string, Comparator<T>>>,
  sortValues: Readonly<Record<string, (row: T) => unknown>> = {},
): T[] {
  if (!sort) return [...rows];
  const sign = sort.direction === "asc" ? 1 : -1;
  const custom = comparators[sort.key];
  const valueOf = sortValues[sort.key] ?? ((row: T) => (row as Record<string, unknown>)[sort.key]);
  return [...rows].sort((a, b) => {
    if (custom) return sign * custom(a, b);
    const left = valueOf(a);
    const right = valueOf(b);
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

/** Same rows in the same order (by identity). Tells a real data change from a parent re-render. */
export function sameRows<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((row, index) => row === b[index]);
}
