import { describe, expect, it } from "vitest";

import {
  callCountText,
  failedText,
  percentText,
  progressBarPercent,
  remainingTimeText,
} from "./sessionProgress";

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

describe("percentText (PBI-12 AC5)", () => {
  it("writes the server decimal with an Indonesian comma", () => {
    expect(percentText("80.0")).toBe("80,0%");
  });

  it("keeps one decimal, the same precision the server rounds to", () => {
    expect(percentText(12.5)).toBe("12,5%");
    expect(percentText("0.0")).toBe("0,0%");
  });

  it("shows a dash when the value is not a number, like caseCountText does", () => {
    expect(percentText("abc")).toBe("–");
  });
});

describe("failedText (PBI-12 AC5)", () => {
  it("says the count and the percentage together", () => {
    expect(failedText(12, "5.0")).toBe("12 gagal (5,0%)");
  });

  it("says there are none instead of writing a zero", () => {
    expect(failedText(0, "0.0")).toBe("Tidak ada kegagalan");
  });

  it("groups thousands the same way the call count does", () => {
    expect(failedText(1200, "80.0")).toBe("1.200 gagal (80,0%)");
  });
});

describe("remainingTimeText (PBI-12 AC5)", () => {
  // The server sends null until one call has finished, because the speed is not known yet.
  it("says it cannot be estimated yet when the server sends null", () => {
    expect(remainingTimeText(null)).toBe("Belum bisa diperkirakan");
  });

  it("says it is done when nothing is left", () => {
    expect(remainingTimeText(0)).toBe("Selesai");
  });

  it("does not promise a number of minutes below one minute", () => {
    expect(remainingTimeText(1)).toBe("kurang dari 1 menit");
    expect(remainingTimeText(59)).toBe("kurang dari 1 menit");
  });

  it("rounds minutes up, so it never promises faster than it is", () => {
    expect(remainingTimeText(60)).toBe("sekitar 1 menit");
    expect(remainingTimeText(300)).toBe("sekitar 5 menit");
    expect(remainingTimeText(301)).toBe("sekitar 6 menit");
  });

  it("reads in hours once an hour is left", () => {
    expect(remainingTimeText(3600)).toBe("sekitar 1 jam");
    expect(remainingTimeText(7500)).toBe("sekitar 2 jam 5 menit");
  });
});