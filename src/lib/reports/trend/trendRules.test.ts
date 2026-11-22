import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { eligibleSession } from "@/test/reportFixtures";
import { trendPoint, trendRead } from "@/test/trendFixtures";

import {
  effectiveTrendScope,
  hasDrawablePoint,
  pointNotes,
  productOptions,
  trendErrorMessage,
  trendPdfErrorMessage,
  trendPdfFileName,
  trendWarnings,
} from "./trendRules";

const FORBIDDEN_TEXT = "Peran Anda hanya boleh melihat tren skor test.";

describe("effectiveTrendScope", () => {
  // Positive
  it("keeps the picked case type when the role may see it", () => {
    expect(effectiveTrendScope("developer_ai", "dev")).toBe("dev");
    expect(effectiveTrendScope("admin", "dev_test")).toBe("dev_test");
  });

  // Negative
  it("falls back to test for a role that may only see test scores", () => {
    expect(effectiveTrendScope("viewer", "dev")).toBe("test");
    expect(effectiveTrendScope("contributor", "dev_test")).toBe("test");
  });

  // Edge case
  it("falls back to test while the role is still unknown", () => {
    expect(effectiveTrendScope(null, "dev")).toBe("test");
  });
});

describe("productOptions", () => {
  // Positive
  it("lists each product once, sorted by name", () => {
    // Arrange
    const sessions = [
      eligibleSession({ product_id: "p-b", product_name: "Bravo" }),
      eligibleSession({ product_id: "p-a", product_name: "AiYU" }),
      eligibleSession({ product_id: "p-b", product_name: "Bravo" }),
    ];

    // Act
    const options = productOptions(sessions);

    // Assert
    expect(options).toEqual([
      { id: "p-a", name: "AiYU" },
      { id: "p-b", name: "Bravo" },
    ]);
  });

  // Edge case
  it("returns an empty list when there are no sessions", () => {
    expect(productOptions([])).toEqual([]);
  });

  // Edge case
  it("keeps products whose sessions are not eligible yet, because the trend itself filters them", () => {
    // Arrange
    const sessions = [eligibleSession({ product_id: "p-a", product_name: "AiYU", eligible: false })];

    // Act / Assert
    expect(productOptions(sessions)).toEqual([{ id: "p-a", name: "AiYU" }]);
  });
});

describe("trendErrorMessage", () => {
  // Negative
  it("explains a refused case type with the role rule", () => {
    expect(trendErrorMessage(new ApiError(403, "TREND_SCOPE_FORBIDDEN"))).toBe(FORBIDDEN_TEXT);
  });

  // Negative
  it("says the product was not found on a 404", () => {
    expect(trendErrorMessage(new ApiError(404, "PRODUCT_NOT_FOUND"))).toBe("Produk tidak ditemukan.");
  });

  // Edge case
  it.each([
    ["a server error", new ApiError(500, "INTERNAL")],
    ["a 403 with another code", new ApiError(403, "SOMETHING_ELSE")],
    ["a network failure", new TypeError("Failed to fetch")],
  ])("uses the retry message for %s", (_name, error) => {
    expect(trendErrorMessage(error)).toBe("Tren gagal dimuat. Coba lagi.");
  });
});

describe("trendPdfErrorMessage", () => {
  // Negative
  it("explains a refused case type with the role rule", () => {
    expect(trendPdfErrorMessage(new ApiError(403, "TREND_SCOPE_FORBIDDEN"))).toBe(FORBIDDEN_TEXT);
  });

  // Negative
  it("says the product was not found on a 404", () => {
    expect(trendPdfErrorMessage(new ApiError(404, "PRODUCT_NOT_FOUND"))).toBe("Produk tidak ditemukan.");
  });

  // Edge case
  it("uses the PDF retry message for anything else", () => {
    expect(trendPdfErrorMessage(new ApiError(500, "INTERNAL"))).toBe("PDF tren gagal dimuat. Coba lagi.");
  });
});

describe("trendPdfFileName", () => {
  // Positive
  it("names the file after the product and every filter, so two downloads never overwrite each other", () => {
    // Arrange
    const query = { productId: "11111111-1111-4111-8111-111111111111", scope: "test", metric: "llm", range: "6m" } as const;

    // Act
    const name = trendPdfFileName(query);

    // Assert
    expect(name).toBe("tren-11111111-1111-4111-8111-111111111111-test-llm-6m.pdf");
  });

  // Edge case
  it("replaces characters that are not safe in a file name", () => {
    // Arrange
    const query = { productId: "../a b", scope: "dev_test", metric: "total", range: "all" } as const;

    // Act
    const name = trendPdfFileName(query);

    // Assert
    expect(name).toBe("tren----a-b-dev_test-total-all.pdf");
  });
});

describe("hasDrawablePoint (AC11)", () => {
  // Positive
  it("is true when at least one point has a score", () => {
    expect(hasDrawablePoint([trendPoint({ value: null }), trendPoint({ value: "0.00" })])).toBe(true);
  });

  // Negative
  it("is false when every point has no score, so no line is drawn", () => {
    expect(hasDrawablePoint([trendPoint({ value: null }), trendPoint({ value: null })])).toBe(false);
  });

  // Edge case
  it("is false for a product with no points", () => {
    expect(hasDrawablePoint([])).toBe(false);
  });
});

describe("pointNotes (AC5)", () => {
  // Positive
  it("lists the break reasons first, then the markers, in plain Indonesian", () => {
    // Arrange
    const point = trendPoint({ breaks: ["RUBRIC_VERSION", "JUDGE_MODEL"], markers: ["REPETITIONS_DIFFER"] });

    // Act
    const notes = pointNotes(point);

    // Assert
    expect(notes).toEqual([
      "Versi rubrik penilaian berbeda",
      "Model penilai berbeda",
      "Jumlah percobaan berbeda",
    ]);
  });

  // Edge case
  it("returns nothing for a point that is connected and unmarked", () => {
    expect(pointNotes(trendPoint())).toEqual([]);
  });
});

describe("trendWarnings (AC11)", () => {
  // Positive
  it("turns the warning codes into readable text", () => {
    expect(trendWarnings(trendRead({ warnings: ["NO_SHARED_CASES"] }))).toEqual([
      "Tidak ada kasus yang sama antar sesi, jadi garis tren tidak digambar.",
    ]);
  });

  // Edge case
  it("shows each text once even when the server repeats a code", () => {
    expect(trendWarnings(trendRead({ warnings: ["NO_SHARED_CASES", "NO_SHARED_CASES"] }))).toHaveLength(1);
  });

  // Edge case
  it("returns nothing when there are no warnings", () => {
    expect(trendWarnings(trendRead())).toEqual([]);
  });
});
