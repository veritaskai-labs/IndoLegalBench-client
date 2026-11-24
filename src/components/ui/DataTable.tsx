"use client";

import { type ReactNode, useMemo, useState } from "react";
import { type Comparator, nextSort, paginate, type SortDirection, type SortState, sortRows } from "@/lib/ui/tableModel";
import { Pager } from "./Pager";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  /** Overrides the default comparison of the cell value for this column. */
  compare?: Comparator<T>;
  cell: (row: T) => ReactNode;
};

type Props<T> = {
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  /** Shown in place of the rows when there are none, e.g. an EmptyState message with a next step. */
  empty?: ReactNode;
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
export function DataTable<T>({ columns, rows, rowKey, pageSize = 10, empty }: Readonly<Props<T>>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);

  const comparators = useMemo(() => {
    const map: Record<string, Comparator<T>> = {};
    for (const column of columns) if (column.compare) map[column.key] = column.compare;
    return map;
  }, [columns]);

  const sorted = useMemo(() => sortRows(rows, sort, comparators), [rows, sort, comparators]);
  const paged = paginate(sorted, page, pageSize);

  function toggleSort(key: string) {
    setSort((current) => nextSort(current, key));
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-control border border-line bg-paper">
        <table className="w-full border-separate border-spacing-0 text-[13px] leading-[19.5px]">
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
                <tr key={rowKey(row)} className="hover:bg-surface-hover">
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
      {paged.lastPage > 1 && <Pager page={paged.page} lastPage={paged.lastPage} onPageChange={setPage} />}
    </div>
  );
}
