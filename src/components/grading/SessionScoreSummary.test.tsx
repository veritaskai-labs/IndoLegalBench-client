import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { gradingResponse } from "@/test/gradingFixtures";
import { SessionScoreSummary } from "./SessionScoreSummary";

function rowCells(table: HTMLElement, group: string): string[] {
  const row = within(table).getByRole("row", { name: new RegExp(`^${group}`) });
  return within(row).getAllByRole("cell").map((cell) => cell.textContent ?? "");
}

describe("SessionScoreSummary (PBI-14 AC1, AC3, PBI-11 AC9)", () => {
  it("shows Dev, Test and Gabungan, each with both paths side by side", () => {
    render(<SessionScoreSummary scores={gradingResponse().scores} />);
    const table = screen.getByRole("table", { name: "Skor sesi" });

    expect(within(table).getByRole("columnheader", { name: "Deterministik" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Penilai LLM" })).toBeInTheDocument();
    expect(rowCells(table, "Dev")).toEqual(["1,00", "4,00"]);
    expect(rowCells(table, "Test")).toEqual(["0,50", "3,25"]);
    expect(rowCells(table, "Gabungan")).toEqual(["0,75", "3,63"]);
  });

  // AC3: no percent and no "X dari N" anywhere.
  it("never shows a percent or an X dari N count", () => {
    render(<SessionScoreSummary scores={gradingResponse().scores} />);
    const text = screen.getByRole("table", { name: "Skor sesi" }).textContent ?? "";

    expect(text).not.toMatch(/%| dari /);
  });

  // Edge: a group with no graded case yet (e.g. a session with only dev cases has no test score).
  it("shows dashes for a group without a score", () => {
    const scores = { ...gradingResponse().scores, test: { deterministic: null, judge: null } };
    render(<SessionScoreSummary scores={scores} />);

    expect(rowCells(screen.getByRole("table", { name: "Skor sesi" }), "Test")).toEqual(["–", "–"]);
  });
});
