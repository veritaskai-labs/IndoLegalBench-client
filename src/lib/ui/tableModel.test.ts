import { describe, expect, it } from "vitest";
import { nextSort, paginate, sortRows } from "./tableModel";

type Row = { name: string | null; score: number | null };

const rows: Row[] = [
  { name: "Budi", score: 2 },
  { name: "ani", score: 10 },
  { name: null, score: 5 },
  { name: "Citra", score: null },
];

describe("nextSort", () => {
  it("starts ascending when a new column is chosen", () => {
    expect(nextSort(null, "name")).toEqual({ key: "name", direction: "asc" });
    expect(nextSort({ key: "score", direction: "desc" }, "name")).toEqual({
      key: "name",
      direction: "asc",
    });
  });

  it("flips direction when the same column is chosen again", () => {
    expect(nextSort({ key: "name", direction: "asc" }, "name")).toEqual({
      key: "name",
      direction: "desc",
    });
    expect(nextSort({ key: "name", direction: "desc" }, "name")).toEqual({
      key: "name",
      direction: "asc",
    });
  });
});

describe("sortRows", () => {
  it("returns the rows untouched when no sort is active", () => {
    expect(sortRows(rows, null, {})).toEqual(rows);
  });

  it("sorts text case-insensitively and puts empty values last", () => {
    const result = sortRows(rows, { key: "name", direction: "asc" }, {});

    expect(result.map((r) => r.name)).toEqual(["ani", "Budi", "Citra", null]);
  });

  it("sorts numbers by value, not as text, and keeps empty values last when descending", () => {
    const result = sortRows(rows, { key: "score", direction: "desc" }, {});

    expect(result.map((r) => r.score)).toEqual([10, 5, 2, null]);
  });

  it("does not mutate the input array", () => {
    const copy = [...rows];

    sortRows(rows, { key: "score", direction: "asc" }, {});

    expect(rows).toEqual(copy);
  });

  it("keeps the original order of rows that compare equal", () => {
    const tied = [
      { name: "a", score: 1 },
      { name: "b", score: 1 },
      { name: "c", score: 1 },
    ];

    const result = sortRows(tied, { key: "score", direction: "desc" }, {});

    expect(result.map((r) => r.name)).toEqual(["a", "b", "c"]);
  });

  it("uses a custom comparator for the column when one is given", () => {
    const byLength = (a: Row, b: Row) => (a.name?.length ?? 0) - (b.name?.length ?? 0);

    const result = sortRows(rows, { key: "name", direction: "asc" }, { name: byLength });

    expect(result.map((r) => r.name)).toEqual([null, "ani", "Budi", "Citra"]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it("slices the requested page", () => {
    const result = paginate(items, 2, 10);

    expect(result).toEqual({ items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], page: 2, lastPage: 3, total: 25 });
  });

  it("returns the short last page", () => {
    expect(paginate(items, 3, 10).items).toEqual([21, 22, 23, 24, 25]);
  });

  it("clamps a page past the end and a page below one", () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, -4, 10).items[0]).toBe(1);
  });

  it("reports one empty page for no rows", () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, lastPage: 1, total: 0 });
  });

  it("rejects a page size below one", () => {
    expect(() => paginate(items, 1, 0)).toThrow(RangeError);
  });
});
