import { describe, expect, it } from "vitest";
import { filesWith, sourceFiles, violations } from "@/test/sourceFiles";

const SCROLL_WRAPPER = /overflow-(?:x-)?(?:auto|scroll)/;
const WRAPPER_LOOKBACK = 3;

// Narrow on purpose, so they fit a phone without scrolling. Still checked by hand at 390px.
const NARROW: Record<string, string> = {
  "src/components/grading/GradeEstimateTable.tsx": "two-column label/value list, values break-words",
  "src/components/reports/comparison/ProductMappingPanel.tsx": "max-w-md, two short columns",
  "src/components/rubrics/LevelsEditor.tsx": "two fixed narrow columns (w-14, w-24) and one flexible column",
  "src/components/suites/SuiteList.tsx": "the data table renders through DataTable; only the loading skeleton table is bare",
};

// The table component has no wrapper of its own; every caller must provide one.
const WRAPPED_BY_CALLER: Record<string, string> = {
  "src/components/audit/AuditTable.tsx": "AuditTable",
};

// Reported bugs. Delete the entry once its fix lands; the last test fails until you do.
const KNOWN: Record<string, string> = {};

const files = sourceFiles("src");
const hasWrapperAbove = (index: number, lines: string[]) =>
  lines.slice(Math.max(0, index - WRAPPER_LOOKBACK), index).some((line) => SCROLL_WRAPPER.test(line));

const exempt = new Set([...Object.keys(NARROW), ...Object.keys(WRAPPED_BY_CALLER)]);
const unwrapped = violations(
  files.filter((file) => !exempt.has(file.path)),
  (line, index, lines) => /<table[\s>]/.test(line) && !hasWrapperAbove(index, lines),
);

describe("tabel lebar bisa digeser di ponsel tanpa menggeser halaman (PBI-25 AC5)", () => {
  it("setiap tabel dibungkus elemen overflow-x-auto", () => {
    expect(unwrapped.filter((hit) => !filesWith([hit]).some((file) => file in KNOWN))).toEqual([]);
  });

  it.each(Object.values(WRAPPED_BY_CALLER))("setiap pemanggil %s menyediakan pembungkus scroll", (component) => {
    const usage = new RegExp(`<${component}[\\s>/]`);
    const calls = violations(files, (line) => usage.test(line));
    const bare = violations(files, (line, index, lines) => usage.test(line) && !hasWrapperAbove(index, lines));

    expect(calls.length).toBeGreaterThan(0);
    expect(bare).toEqual([]);
  });

  it("daftar bug yang diketahui masih akurat", () => {
    expect(filesWith(unwrapped)).toEqual(Object.keys(KNOWN).sort());
  });
});
