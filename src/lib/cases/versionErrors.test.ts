import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { mapVersionError } from "./versionErrors";

describe("mapVersionError", () => {
  // Positive: the three 409 codes each get their own message.
  it.each([
    ["VERSION_IN_PROGRESS", "Sudah ada versi baru yang sedang dikerjakan atau ditinjau."],
    [
      "NO_APPROVED_VERSION",
      "Kasus ini belum punya versi yang disetujui, jadi belum bisa dibuatkan versi baru.",
    ],
    ["VERSION_LOCKED", "Versi yang sudah disetujui tidak bisa diubah. Buat versi baru dulu."],
  ])("maps the 409 code %s to its own message", (code, expected) => {
    // Arrange
    const error = new ApiError(409, code);

    // Act
    const message = mapVersionError(error, "fork");

    // Assert
    expect(message).toBe(expected);
  });

  // Positive: the same 403 reads differently per action.
  it.each([
    ["fork", "Anda tidak memiliki izin untuk membuat versi baru kasus ini."],
    ["history", "Anda tidak memiliki izin untuk melihat riwayat versi kasus ini."],
    ["compare", "Anda tidak memiliki izin untuk membandingkan versi kasus ini."],
  ] as const)("explains a 403 for %s", (action, expected) => {
    // Arrange
    const error = new ApiError(403, "FORBIDDEN");

    // Act
    const message = mapVersionError(error, action);

    // Assert
    expect(message).toBe(expected);
  });

  it("says a version is missing when comparing returns 404", () => {
    // Arrange
    const error = new ApiError(404, "VERSION_NOT_FOUND");

    // Act
    const message = mapVersionError(error, "compare");

    // Assert
    expect(message).toBe("Salah satu versi yang dipilih tidak ditemukan.");
  });

  it("says the case is missing when the history returns 404", () => {
    // Arrange
    const error = new ApiError(404, "CASE_NOT_FOUND");

    // Act
    const message = mapVersionError(error, "history");

    // Assert
    expect(message).toBe("Kasus tidak ditemukan.");
  });

  it("asks for valid version numbers when comparing returns 422", () => {
    // Arrange
    const error = new ApiError(422, "VALIDATION_ERROR");

    // Act
    const message = mapVersionError(error, "compare");

    // Assert
    expect(message).toBe("Pilih dua nomor versi yang valid untuk dibandingkan.");
  });

  // Negative: unknown failures fall back to the action's own default.
  it("falls back to the default message for an unmapped status", () => {
    // Arrange
    const error = new ApiError(500, "INTERNAL_ERROR");

    // Act
    const message = mapVersionError(error, "fork");

    // Assert
    expect(message).toBe("Gagal membuat versi baru. Coba lagi.");
  });

  // Edge: a 422 outside compare is not a version-number problem.
  it("does not use the compare wording for a 422 on fork", () => {
    // Arrange
    const error = new ApiError(422, "VALIDATION_ERROR");

    // Act
    const message = mapVersionError(error, "fork");

    // Assert
    expect(message).toBe("Gagal membuat versi baru. Coba lagi.");
  });

  // Edge: a network failure is not an ApiError.
  it("falls back to the default message when the error is not an ApiError", () => {
    // Arrange
    const error = new TypeError("Failed to fetch");

    // Act
    const message = mapVersionError(error, "history");

    // Assert
    expect(message).toBe("Gagal memuat riwayat versi.");
  });

  // Edge: the code wins over the status.
  it("prefers the server code over a generic 403 message", () => {
    // Arrange
    const error = new ApiError(403, "VERSION_LOCKED");

    // Act
    const message = mapVersionError(error, "fork");

    // Assert
    expect(message).toBe("Versi yang sudah disetujui tidak bisa diubah. Buat versi baru dulu.");
  });
});
