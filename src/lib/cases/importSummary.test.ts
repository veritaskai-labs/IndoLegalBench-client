import { describe, expect, it } from "vitest";
import type { ImportRow, ImportSummary } from "@/types/caseImport";
import {
  FILTERS,
  STATUS_LABEL,
  defaultFilter,
  emptyFilterMessage,
  filterCount,
  hasCreatedCases,
  rowsForFilter,
} from "./importSummary";

function row(row_no: number, status: ImportRow["status"]): ImportRow {
  const created = status === "created";
  return {
    row_no,
    status,
    case_id: created ? `c-${row_no}` : null,
    case_code: created ? `IMPOR-AAAA0000-${String(row_no).padStart(3, "0")}` : null,
    reason: created ? null : `alasan baris ${row_no}`,
  };
}

function summaryOf(rows: ImportRow[]): ImportSummary {
  return {
    batch_id: "b-1",
    file_name: "kasus.csv",
    imported_by: "u-1",
    imported_at: "2026-11-23T14:00:00Z",
    suite_id: "s-1",
    suite_name: "Impor CSV",
    total_rows: rows.length,
    success_count: rows.filter((r) => r.status === "created").length,
    failed_count: rows.filter((r) => r.status === "failed").length,
    skipped_count: rows.filter((r) => r.status === "skipped").length,
    rows,
  };
}

/** Out of order on purpose: the server sorts, but the page must not depend on it. */
const MIXED = [row(5, "skipped"), row(2, "created"), row(4, "failed"), row(3, "created"), row(6, "failed")];

describe("FILTERS and STATUS_LABEL", () => {
  // Positive: the four filter buttons in reading order, failures first after "all".
  it("offers all, failed, skipped and created, in that order", () => {
    // Arrange / Act / Assert
    expect(FILTERS).toEqual([
      { value: "all", label: "Semua" },
      { value: "failed", label: "Gagal" },
      { value: "skipped", label: "Dilewati" },
      { value: "created", label: "Berhasil" },
    ]);
  });

  // Positive: a label for every status of the contract enum (a new enum value fails tsc on the Record).
  it("labels each row status in Indonesian", () => {
    // Arrange / Act / Assert
    expect(STATUS_LABEL).toEqual({ created: "Berhasil", failed: "Gagal", skipped: "Dilewati" });
  });
});

describe("defaultFilter", () => {
  // Positive: the user came to fix failures, so show them first.
  it("opens on the failed rows when there are any", () => {
    // Arrange / Act / Assert
    expect(defaultFilter(summaryOf(MIXED))).toBe("failed");
  });

  // Edge: nothing failed (all created, all skipped).
  it.each([
    ["all created", [row(2, "created")]],
    ["all skipped", [row(2, "skipped"), row(3, "skipped")]],
  ])("opens on all rows when %s", (_, rows) => {
    // Arrange / Act / Assert
    expect(defaultFilter(summaryOf(rows))).toBe("all");
  });
});

describe("rowsForFilter", () => {
  // Positive: sorted by spreadsheet row number, so a reason is easy to find in Google Sheets.
  it("returns all rows sorted by row number", () => {
    // Arrange / Act
    const rows = rowsForFilter(MIXED, "all");

    // Assert
    expect(rows.map((r) => r.row_no)).toEqual([2, 3, 4, 5, 6]);
  });

  it.each([
    ["failed", [4, 6]],
    ["skipped", [5]],
    ["created", [2, 3]],
  ] as const)("keeps only the %s rows, sorted", (filter, expected) => {
    // Arrange / Act
    const rows = rowsForFilter(MIXED, filter);

    // Assert
    expect(rows.map((r) => r.row_no)).toEqual(expected);
    expect(rows.every((r) => r.status === filter)).toBe(true);
  });

  // Edge: the summary from the server is not changed in place.
  it("does not reorder the rows it was given", () => {
    // Arrange
    const input = [...MIXED];

    // Act
    rowsForFilter(input, "all");

    // Assert
    expect(input.map((r) => r.row_no)).toEqual([5, 2, 4, 3, 6]);
  });

  // Edge: a filter with no rows.
  it("returns an empty list when no row has that status", () => {
    // Arrange / Act / Assert
    expect(rowsForFilter([row(2, "created")], "failed")).toEqual([]);
  });

  // Edge: the maximum file size of AC4.
  it("handles 500 rows", () => {
    // Arrange
    const many = Array.from({ length: 500 }, (_, i) => row(501 - i, i % 2 === 0 ? "created" : "failed"));

    // Act
    const rows = rowsForFilter(many, "all");

    // Assert
    expect(rows).toHaveLength(500);
    expect(rows[0].row_no).toBe(2);
    expect(rows[499].row_no).toBe(501);
  });
});

describe("filterCount", () => {
  // Positive: counts come from the rows, so a button count always equals the rows it shows.
  it.each([
    ["all", 5],
    ["failed", 2],
    ["skipped", 1],
    ["created", 2],
  ] as const)("counts %s rows", (filter, expected) => {
    // Arrange / Act / Assert
    expect(filterCount(MIXED, filter)).toBe(expected);
  });

  // Edge
  it("counts zero for an empty list", () => {
    // Arrange / Act / Assert
    expect(filterCount([], "all")).toBe(0);
  });
});

describe("hasCreatedCases", () => {
  // Positive: the temporary suite only holds cases when something was created.
  it("is true when at least one case was created", () => {
    // Arrange / Act / Assert
    expect(hasCreatedCases(summaryOf(MIXED))).toBe(true);
  });

  // Negative: the server archives an empty temporary suite, so no link to it.
  it.each([
    ["all failed", [row(2, "failed")]],
    ["all skipped", [row(2, "skipped")]],
  ])("is false when %s", (_, rows) => {
    // Arrange / Act / Assert
    expect(hasCreatedCases(summaryOf(rows))).toBe(false);
  });
});

describe("emptyFilterMessage", () => {
  it.each([
    ["all", "Tidak ada baris di ringkasan ini."],
    ["failed", "Tidak ada baris yang gagal."],
    ["skipped", "Tidak ada baris yang dilewati."],
    ["created", "Tidak ada kasus yang berhasil masuk."],
  ] as const)("explains an empty %s filter", (filter, expected) => {
    // Arrange / Act / Assert
    expect(emptyFilterMessage(filter)).toBe(expected);
  });
});
