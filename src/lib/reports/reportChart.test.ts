import { describe, expect, it } from "vitest";

import { firstReport, reportResult, reportSession } from "@/test/reportFixtures";

import { axisTicks, barPercent, chartScale } from "./reportChart";
import { reportSections } from "./reportSections";

const rowsOf = (scores: [string | null, string | null][]) =>
  reportSections(
    scores.map(([det, llm], index) =>
      reportSession({ product_label: `P${index}`, results: [reportResult({ det_score: det, llm_score: llm })] }),
    ),
  )[0]?.rows ?? [];

// SCRUM-322 (Fase 0 K4, K7): the horizontal bar chart. Scores run from 0 to 1, so the axis ends at 1 unless the
// server ever sends a larger score (pdf.py uses the same max(1, ...)). An empty score draws no bar at all.
describe("chartScale", () => {
  it("ends the axis at 1 for ordinary scores", () => {
    expect(chartScale(reportSections(firstReport().sessions)[0].rows)).toBe(1);
  });

  // Boundary: exactly 1.00 stays on a scale of 1; a score above 1 stretches the axis so no bar overflows.
  it.each([
    [[["1.00", "0.50"]], 1],
    [[["1.20", "0.80"]], 1.2],
    [[["0.40", "1.50"]], 1.5],
  ] as const)("uses the largest score as the scale for %j", (scores, scale) => {
    expect(chartScale(rowsOf(scores.map(([det, llm]) => [det, llm])))).toBe(scale);
  });

  // Negative: empty or malformed scores do not count; with nothing usable the axis still ends at 1.
  it.each([
    ["empty scores", [[null, null]]],
    ["malformed scores", [["abc", "1,5"]]],
    ["no rows", []],
  ] as const)("falls back to 1 for %s", (_, scores) => {
    expect(chartScale(rowsOf(scores.map(([det, llm]) => [det, llm])))).toBe(1);
  });
});

describe("barPercent (K7)", () => {
  it.each([
    ["0.91", 1, 91],
    ["0", 1, 0],
    ["1.00", 1, 100],
    ["0.60", 1.2, 50],
  ] as const)("draws %s on a scale of %s as %s percent", (score, scale, percent) => {
    expect(barPercent(score, scale)).toBeCloseTo(percent, 6);
  });

  // K7 and D1: an empty score is not a score of 0, so it gets no bar instead of a zero-width one.
  it("draws no bar for an empty score", () => {
    expect(barPercent(null, 1)).toBeNull();
  });

  it.each(["abc", "", "0,91"])("draws no bar for the malformed score %j", (score) => {
    expect(barPercent(score, 1)).toBeNull();
  });

  // Defensive: whatever arrives, the bar stays inside its track.
  it.each([
    ["-0.10", 0],
    ["2.00", 100],
  ] as const)("keeps %s inside the track at %s percent", (score, percent) => {
    expect(barPercent(score, 1)).toBe(percent);
  });

  it("draws no bar on a scale that is not positive", () => {
    expect(barPercent("0.50", 0)).toBeNull();
  });
});

describe("axisTicks", () => {
  it("splits a scale of 1 into quarters as decimal text for formatScore", () => {
    expect(axisTicks(1)).toEqual(["0.00", "0.25", "0.50", "0.75", "1.00"]);
  });

  it("follows a stretched scale", () => {
    expect(axisTicks(1.2)).toEqual(["0.00", "0.30", "0.60", "0.90", "1.20"]);
  });
});
