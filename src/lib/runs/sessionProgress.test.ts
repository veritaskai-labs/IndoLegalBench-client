import { describe, expect, it } from "vitest";

import { callCountText, progressBarPercent } from "./sessionProgress";

describe("callCountText (PBI-12 AC5)", () => {
  it("reads the way the AC spells it", () => {
    expect(callCountText(240, 300)).toBe("240 dari 300");
  });

  // 300 cases times 5 repetitions is 1500 calls, so the separator is reachable.
  it("groups thousands the Indonesian way", () => {
    expect(callCountText(1200, 1500)).toBe("1.200 dari 1.500");
  });

  it("says nothing has run yet instead of showing 0 dari 0", () => {
    expect(callCountText(0, 0)).toBe("Belum ada panggilan");
  });
});

describe("progressBarPercent (PBI-12 AC5)", () => {
  it("reads the server percentage as a number", () => {
    expect(progressBarPercent("80.0")).toBe(80);
  });

  it("accepts a plain number too, since Decimal may arrive either way", () => {
    expect(progressBarPercent(12.5)).toBe(12.5);
  });

  it("clamps to 0 and 100, so a broken number cannot draw past the bar", () => {
    expect(progressBarPercent("120.0")).toBe(100);
    expect(progressBarPercent("-5.0")).toBe(0);
  });

  it("falls back to 0 when the value is not a number at all", () => {
    expect(progressBarPercent("")).toBe(0);
  });
});