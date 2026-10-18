import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { mapReviewError } from "./reviewErrors";

describe("mapReviewError", () => {
  // Positive: each server code that means something specific gets its own message.
  it.each([
    [422, "COMMENT_REQUIRED", "Komentar wajib diisi saat meminta revisi."],
    [
      409,
      "ASSIGNMENT_NOT_ACTIVE",
      "Penugasan ini sudah diganti atau dibatalkan, jadi penilaian tidak bisa dikirim.",
    ],
    [409, "ROUND_NOT_OPEN", "Putaran tinjauan ini sedang tidak menerima penilaian."],
    [409, "VERDICT_ALREADY_SUBMITTED", "Penilaian untuk penugasan ini sudah dikirim."],
    [403, "REVIEWER_IS_AUTHOR", "Anda tidak bisa meninjau kasus yang Anda tulis."],
    [403, "NOT_YOUR_ASSIGNMENT", "Penugasan ini milik reviewer lain."],
  ])("maps %s %s to its own message", (status, code, expected) => {
    // Arrange
    const error = new ApiError(status, code);

    // Act
    const message = mapReviewError(error, "submit");

    // Assert
    expect(message).toBe(expected);
  });

  // Positive: the code wins over the generic status text, whatever the action.
  it("maps a known code the same way for every action", () => {
    // Arrange
    const error = new ApiError(409, "ROUND_NOT_OPEN");

    // Act
    const messages = (["list", "submit", "caseReview"] as const).map((action) =>
      mapReviewError(error, action),
    );

    // Assert
    expect(new Set(messages)).toEqual(new Set(["Putaran tinjauan ini sedang tidak menerima penilaian."]));
  });

  // Positive: the same 403 reads differently per action.
  it.each([
    ["list", "Anda tidak memiliki izin untuk melihat antrean tinjauan."],
    ["submit", "Anda tidak memiliki izin untuk menilai kasus ini."],
    ["caseReview", "Anda tidak memiliki izin untuk melihat penilaian kasus ini."],
  ] as const)("explains a plain 403 for %s", (action, expected) => {
    // Arrange
    const error = new ApiError(403, "FORBIDDEN");

    // Act
    const message = mapReviewError(error, action);

    // Assert
    expect(message).toBe(expected);
  });

  it("says the assignment is missing when submitting returns 404", () => {
    // Arrange
    const error = new ApiError(404, "NOT_FOUND");

    // Act
    const message = mapReviewError(error, "submit");

    // Assert
    expect(message).toBe("Penugasan tidak ditemukan atau sudah selesai.");
  });

  it("says the case was never submitted when the review has no round", () => {
    // Arrange
    const error = new ApiError(404, "NO_REVIEW_ROUND");

    // Act
    const message = mapReviewError(error, "caseReview");

    // Assert
    expect(message).toBe("Kasus ini belum pernah diajukan untuk ditinjau.");
  });

  // Edge: a 404 for an unknown case is not the same as "no round yet".
  it("says the case is missing when the review returns 404 with another code", () => {
    // Arrange
    const error = new ApiError(404, "CASE_NOT_FOUND");

    // Act
    const message = mapReviewError(error, "caseReview");

    // Assert
    expect(message).toBe("Kasus tidak ditemukan.");
  });

  // Negative
  it.each([
    ["list", "Gagal memuat antrean tinjauan. Coba lagi."],
    ["submit", "Gagal mengirim penilaian. Coba lagi."],
    ["caseReview", "Gagal memuat penilaian kasus. Coba lagi."],
  ] as const)("falls back to a retry message for an unknown 500 on %s", (action, expected) => {
    // Arrange
    const error = new ApiError(500, "INTERNAL");

    // Act
    const message = mapReviewError(error, action);

    // Assert
    expect(message).toBe(expected);
  });

  // Edge: a network failure is not an ApiError at all.
  it("falls back to the default message for an error that is not an ApiError", () => {
    // Arrange
    const error = new TypeError("Failed to fetch");

    // Act
    const message = mapReviewError(error, "submit");

    // Assert
    expect(message).toBe("Gagal mengirim penilaian. Coba lagi.");
  });
});
