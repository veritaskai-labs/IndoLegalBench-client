"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  type Comparator,
  nextSort,
  paginate,
  sameRows,
  type SortDirection,
  type SortState,
  sortRows,
} from "@/lib/ui/tableModel";
import { Pager } from "./Pager";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  /** Overrides the default comparison of the cell value for this column. */
  compare?: Comparator<T>;
  /** Value to sort by when the column is derived and its key is not a field of the row. */
  sortValue?: (row: T) => unknown;
  cell: (row: T) => ReactNode;
};

type Props<T> = {
  /** Define outside the component or wrap in useMemo, so the table does not rebuild its sort on every render. */
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  /** Shown in place of the rows when there are none, e.g. an EmptyState message with a next step. */
  empty?: ReactNode;
  /** Screen-reader name of the table, rendered as an sr-only caption. */
  caption?: string;
  /** Footer text for the rows on the current page (1-based, inclusive), e.g. "Menampilkan 1–8 dari 8". Left out when there are no rows. */
  summary?: (range: Readonly<{ from: number; to: number; total: number }>) => ReactNode;
  /** Extra classes for one row, e.g. a marker that must follow the row's real height. */
  rowClassName?: (row: T) => string | undefined;
  /** Sort to start with, e.g. one kept in the address. Read once, like the initial value of useState. */
  initialSort?: SortState | null;
  /** Told about every sort the user picks, so a page can keep it (for example in the address). */
  onSortChange?: (sort: SortState) => void;
  /** Reset to page 1 when rows change (default true). Set false to stay on the current page across reloads. */
  resetPageOnDataChange?: boolean;
  /** Optional row click handler; clicks originating from interactive controls inside the row are ignored. */
  onRowClick?: (row: T) => void;
};

function SortIcon({ direction }: Readonly<{ direction?: SortDirection }>) {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true" className="text-subtle">
      <path d="M5 1 8.5 5h-7z" fill="currentColor" opacity={direction === "desc" ? 0.25 : 1} />
      <path d="M5 11 1.5 7h7z" fill="currentColor" opacity={direction === "asc" ? 0.25 : 1} />
    </svg>
  );
}

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/** aria-sort only belongs on sortable headers: "none" until the column is the active sort. */
function ariaSortFor(sortable: boolean | undefined, active: SortState | null) {
  if (!sortable) return undefined;
  return active ? ARIA_SORT[active.direction] : "none";
}

/** Table with the platform's one sorting and paging pattern; the rules live in lib/ui/tableModel. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pageSize = 10,
  empty,
  caption,
  summary,
  rowClassName,
  initialSort = null,
  onSortChange,
  resetPageOnDataChange = true,
  onRowClick,
}: Readonly<Props<T>>) {
  const [sort, setSort] = useState<SortState | null>(initialSort);
  const [page, setPage] = useState(1);

  // Back to page one when the rows really change (filter, refetch), but not on a re-render with the same rows.
  const [seenRows, setSeenRows] = useState(rows);
  if (seenRows !== rows) {
    setSeenRows(rows);
    if (resetPageOnDataChange && !sameRows(seenRows, rows)) setPage(1);
  }

  // Only the active column's sort hooks matter, so inline columns do not invalidate the sorted rows.
  const activeColumn = sort ? columns.find((column) => column.key === sort.key) : undefined;
  const activeCompare = activeColumn?.compare;
  const activeSortValue = activeColumn?.sortValue;
  const sorted = useMemo(() => {
    const key = sort?.key ?? "";
    return sortRows(
      rows,
      sort,
      activeCompare ? { [key]: activeCompare } : {},
      activeSortValue ? { [key]: activeSortValue } : {},
    );
  }, [rows, sort, activeCompare, activeSortValue]);
  const paged = paginate(sorted, page, pageSize);

  function toggleSort(key: string) {
    const next = nextSort(sort, key);
    setSort(next);
    setPage(1);
    onSortChange?.(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-control border border-line bg-paper">
        <table className="w-full border-separate border-spacing-0 text-[13px] leading-[19.5px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key ? sort : null;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSortFor(column.sortable, active)}
                    className="h-9 whitespace-nowrap bg-surface px-3 py-2 text-left font-medium text-ink-soft"
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex cursor-pointer items-center gap-1 font-medium"
                      >
                        {column.header}
                        <SortIcon direction={active?.direction} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="border-t border-line-soft p-0">
                  {empty}
                </td>
              </tr>
            ) : (
              paged.items.map((row) => (
                // Row click convenience; interactive descendants (links/buttons) still handle keyboard navigation.
                <tr // NOSONAR
                  key={rowKey(row)}
                  onClick={onRowClick ? (event) => { if (!(event.target as HTMLElement).closest("a, button, input, select, textarea")) onRowClick(row); } : undefined} // NOSONAR
                  className={`hover:bg-surface-hover ${onRowClick ? "cursor-pointer " : ""}${rowClassName?.(row) ?? ""}`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="h-[52px] border-t border-line-soft px-3 py-2.5 align-middle">
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {summary && paged.total > 0 && (
        <p className="text-[13px] text-muted">
          {summary({
            from: (paged.page - 1) * pageSize + 1,
            to: (paged.page - 1) * pageSize + paged.items.length,
            total: paged.total,
          })}
        </p>
      )}
      {paged.lastPage > 1 && <Pager page={paged.page} lastPage={paged.lastPage} onPageChange={setPage} />}
    </div>
  );
}
