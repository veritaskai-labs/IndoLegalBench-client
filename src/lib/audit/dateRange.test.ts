import { describe, expect, it } from "vitest";
import { clampDateRange } from "./dateRange";

const TODAY = new Date("2026-10-06T00:00:00Z");

describe("clampDateRange (SCRUM-80 AC7)", () => {
  // Positive
  it("keeps a range that sits inside the 90 day window", () => {
    expect(clampDateRange("2026-09-01", "2026-09-30", TODAY)).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      clamped: false,
    });
  });

  // Corner
  it("keeps a range that is exactly 90 days old", () => {
    expect(clampDateRange("2026-07-08", "2026-10-06", TODAY)).toEqual({
      from: "2026-07-08",
      to: "2026-10-06",
      clamped: false,
    });
  });

  // Negative
  it("pulls the start forward when it is older than 90 days", () => {
    expect(clampDateRange("2026-01-01", "2026-10-06", TODAY)).toEqual({
      from: "2026-07-08",
      to: "2026-10-06",
      clamped: true,
    });
  });

  // Negative
  it("pulls the end back when it is in the future", () => {
    expect(clampDateRange("2026-09-01", "2026-12-31", TODAY)).toEqual({
      from: "2026-09-01",
      to: "2026-10-06",
      clamped: true,
    });
  });

  // Negative
  it("swaps the two dates when the author picks them the wrong way round", () => {
    expect(clampDateRange("2026-09-30", "2026-09-01", TODAY)).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      clamped: false,
    });
  });

  // Corner
  it("falls back to the full 90 day window when nothing is picked", () => {
    expect(clampDateRange(null, null, TODAY)).toEqual({
      from: "2026-07-08",
      to: "2026-10-06",
      clamped: false,
    });
  });
});