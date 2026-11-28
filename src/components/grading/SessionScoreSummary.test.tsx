import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { gradingResponse } from "@/test/gradingFixtures";
import { SessionScoreSummary } from "./SessionScoreSummary";

function rowCells(table: HTMLElement, group: string): string[] {
  const row = within(table).getByRole("row", { name: new RegExp(`^${group}`) });
  return within(row).getAllByRole("cell").map((cell) => cell.textContent ?? "");
}

describe("SessionScoreSummary (PBI-14 AC1, AC3, PBI-11 AC9)", () => {
  it("shows Dev, Test and Gabungan, each with every score side by side", () => {
    render(<SessionScoreSummary scores={gradingResponse().scores} versionLabel="Versi 1" />);
    const table = screen.getByRole("table", { name: "Skor sesi" });

    expect(within(table).getByRole("columnheader", { name: "Deterministik" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Kualitas LLM" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Format LLM" })).toBeInTheDocument();
    expect(rowCells(table, "Dev")).toEqual(["1,00", "0,80", "0,75"]);
    expect(rowCells(table, "Test")).toEqual(["0,50", "0,60", "0,50"]);
    expect(rowCells(table, "Gabungan")).toEqual(["0,75", "0,70", "0,63"]);
  });

  // Accessibility (review on #77): the corner cell heads the Dev/Test/Gabungan column, so screen
  // readers get a name for it while sighted users still see an empty corner.
  it("names the group column for screen readers only", () => {
    render(<SessionScoreSummary scores={gradingResponse().scores} versionLabel="Versi 1" />);
    const headers = within(screen.getByRole("table", { name: "Skor sesi" })).getAllByRole("columnheader");

    // The score headers also hold an info tip (SCRUM-375 C4), so only their visible name is compared.
    const names = headers.map((cell) => cell.querySelector("span:not([role='tooltip']):not(.sr-only)")?.firstChild?.textContent ?? cell.textContent);
    expect(names).toEqual(["Kelompok", "Deterministik", "Kualitas LLM", "Format LLM"]);
    expect(within(headers[0]).getByText("Kelompok")).toHaveClass("sr-only");
  });

  // AC3: no percent and no "X dari N" in the scores (the header tips are prose, e.g. "dari prompt penilai").
  it("never shows a percent or an X dari N count", () => {
    render(<SessionScoreSummary scores={gradingResponse().scores} versionLabel="Versi 1" />);
    const text = screen.getByRole("table", { name: "Skor sesi" }).querySelector("tbody")?.textContent ?? "";

    expect(text).not.toMatch(/%| dari /);
  });

  // Edge: a group with no graded case yet (e.g. a session with only dev cases has no test score).
  it("shows dashes for a group without a score", () => {
    const scores = { ...gradingResponse().scores, test: { deterministic: null, quality: null, format: null } };
    render(<SessionScoreSummary scores={scores} versionLabel="Versi 1" />);

    expect(rowCells(screen.getByRole("table", { name: "Skor sesi" }), "Test")).toEqual(["–", "–", "–"]);
  });
});
