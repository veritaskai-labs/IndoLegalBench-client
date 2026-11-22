import { describe, expect, it } from "vitest";

import {
  breakLabel,
  markerLabel,
  TREND_METRIC_LABEL,
  TREND_RANGE_LABEL,
  TREND_SCOPE_LABEL,
  warningLabel,
} from "./trendLabels";

describe("filter labels", () => {
  // Positive
  it("names every metric the contract offers, with the total first (AC3)", () => {
    // Arrange / Act
    const labels = TREND_METRIC_LABEL;

    // Assert
    expect(labels).toEqual({ total: "Skor total", deterministic: "Deterministik", llm: "Penilai LLM" });
  });

  // Positive
  it("names every range the contract offers (AC2)", () => {
    expect(TREND_RANGE_LABEL).toEqual({ "3m": "3 bulan", "6m": "6 bulan", "12m": "12 bulan", all: "Semua" });
  });

  // Positive
  it("names the case types as All, Test only and Dev only (AC12)", () => {
    expect(TREND_SCOPE_LABEL).toEqual({ test: "Test only", dev: "Dev only", dev_test: "All" });
  });
});

describe("breakLabel", () => {
  // Positive
  it.each([
    ["RUBRIC_VERSION", "Versi rubrik penilaian berbeda"],
    ["JUDGE_MODEL", "Model penilai berbeda"],
    ["SUITE_VERSION", "Versi suite atau kasus berbeda"],
    ["MODEL_VERSION_DIFFERS", "Versi model produk berbeda"],
  ])("explains %s in plain Indonesian (AC5)", (code, text) => {
    expect(breakLabel(code)).toBe(text);
  });

  // Edge case
  it("falls back to a generic reason for a code the page does not know yet, without printing the code", () => {
    // Arrange
    const code = "SOMETHING_NEW";

    // Act
    const text = breakLabel(code);

    // Assert
    expect(text).toBe("Data pembanding berbeda");
    expect(text).not.toContain(code);
  });
});

describe("markerLabel", () => {
  // Positive
  it.each([
    ["REPETITIONS_DIFFER", "Jumlah percobaan berbeda"],
    ["TRIAL_SESSION", "Sesi percobaan"],
    ["MANUAL_ANSWER_RANGE_OVER_LIMIT", "Rentang jawaban manual melewati batas"],
  ])("explains %s in plain Indonesian (AC5)", (code, text) => {
    expect(markerLabel(code)).toBe(text);
  });

  // Edge case
  it("falls back to a generic marker for an unknown code", () => {
    expect(markerLabel("SOMETHING_NEW")).toBe("Penanda tambahan");
  });
});

describe("warningLabel", () => {
  // Positive
  it("tells the reader that no line is drawn without shared cases (AC11)", () => {
    expect(warningLabel("NO_SHARED_CASES")).toBe(
      "Tidak ada kasus yang sama antar sesi, jadi garis tren tidak digambar.",
    );
  });

  // Edge case
  it("falls back to a generic warning for an unknown code", () => {
    expect(warningLabel("SOMETHING_NEW")).toBe("Ada peringatan pada data tren ini.");
  });
});
