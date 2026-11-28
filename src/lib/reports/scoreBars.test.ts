import { describe, expect, it } from "vitest";

import { reportResult, reportSession } from "@/test/reportFixtures";

import { reportSections } from "./reportSections";
import { scoreBars } from "./scoreBars";

const rowsOf = (scores: readonly [string, string | null, string | null][]) =>
  reportSections(
    scores.map(([name, det, llm]) =>
      reportSession({ product_label: name, results: [reportResult({ det_score: det, llm_score: llm })] }),
    ),
  )[0].rows;

const view = (rows: ReturnType<typeof rowsOf>, metric: "deterministic" | "llm") =>
  scoreBars(rows, metric).map(({ product, score, percent, top }) => [product, score, percent, top]);

// SCRUM-346 A6 (finding N13): one chart per score, sorted from the highest, so the reader does not have to match
// legend colours across paired bars. The ranking table stays the reference for the rank (D1).
describe("scoreBars", () => {
  it("sorts one metric from the highest and marks the top product", () => {
    const rows = rowsOf([
      ["Low", "0.30", "0.90"],
      ["High", "0.80", "0.10"],
      ["Mid", "0.50", "0.50"],
    ]);
    expect(view(rows, "deterministic")).toEqual([
      ["High", "0.80", 80, true],
      ["Mid", "0.50", 50, false],
      ["Low", "0.30", 30, false],
    ]);
    expect(view(rows, "llm").map(([product]) => product)).toEqual(["Low", "Mid", "High"]);
  });

  // Edge: tied products share the top colour; equal scores keep the server's rank order (stable sort).
  it("marks every product tied at the top", () => {
    const rows = rowsOf([
      ["A", "1.00", null],
      ["B", "1.0", null],
      ["C", "0.20", null],
    ]);
    expect(view(rows, "deterministic").map(([product, , , top]) => [product, top])).toEqual([
      ["A", true],
      ["B", true],
      ["C", false],
    ]);
  });

  // Negative (D1, K7): no score means no bar, not a bar of 0.
  it("leaves out products without a score", () => {
    const rows = rowsOf([
      ["Scored", "0.40", null],
      ["Empty", null, null],
      ["Broken", "n/a", null],
    ]);
    expect(view(rows, "deterministic")).toEqual([["Scored", "0.40", 40, true]]);
    expect(scoreBars(rows, "llm")).toEqual([]);
  });

  // Boundary: a score above 1 stretches this chart's own scale, like chartScale, so no bar overflows.
  it("scales to the largest score when it is above 1", () => {
    const rows = rowsOf([
      ["Big", "2.00", null],
      ["Half", "1.00", null],
    ]);
    expect(view(rows, "deterministic").map(([, , percent]) => percent)).toEqual([100, 50]);
  });

  it("keeps the result id so a bar can link to its cases", () => {
    const rows = rowsOf([["Only", "0.5", null]]);
    expect(scoreBars(rows, "deterministic")[0].resultId).toBe(rows[0].result.id);
  });
});
