import { describe, expect, it } from "vitest";
import { barWidthPercent, formatScore, parseScore } from "./barChart";

describe("barWidthPercent", () => {
  it.each([
    [0, 0],
    [0.85, 85],
    [1, 100],
    [0.333, 33],
    [0.675, 68],
  ])("turns the score %s into a %s percent bar", (score, expected) => {
    expect(barWidthPercent(score)).toBe(expected);
  });

  it("clamps scores outside 0 to 1 so a bad value cannot overflow the track", () => {
    expect(barWidthPercent(1.4)).toBe(100);
    expect(barWidthPercent(-0.2)).toBe(0);
  });

  it("draws no bar for a score that is not a number", () => {
    expect(barWidthPercent(Number.NaN)).toBe(0);
    expect(barWidthPercent(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("parseScore", () => {
  it("reads a score written as text", () => {
    expect(parseScore("0.85")).toBe(0.85);
    expect(parseScore("1")).toBe(1);
  });

  it.each([null, undefined, "", "  ", "-", "n/a"])("returns null for the missing score %j", (input) => {
    expect(parseScore(input)).toBeNull();
  });
});

describe("formatScore", () => {
  it("shows two decimals like the prototype axis", () => {
    expect(formatScore(0.8)).toBe("0.80");
    expect(formatScore(1)).toBe("1.00");
  });

  it("shows a dash when there is no score", () => {
    expect(formatScore(null)).toBe("–");
  });
});
