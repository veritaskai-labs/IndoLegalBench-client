import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { mapCreateSnapshotError } from "./snapshotErrors";

describe("mapCreateSnapshotError", () => {
  // Positive: one message per known failure.
  it("explains that a suite without approved cases has nothing to freeze", () => {
    // Arrange
    const error = new ApiError(422, "NOTHING_TO_SNAPSHOT");

    // Act
    const message = mapCreateSnapshotError(error);

    // Assert
    expect(message).toBe("Suite ini belum punya kasus yang disetujui, jadi belum ada yang bisa dibekukan.");
  });

  it("says only admins may create a snapshot on 403", () => {
    // Arrange
    const error = new ApiError(403, "FORBIDDEN");

    // Act
    const message = mapCreateSnapshotError(error);

    // Assert
    expect(message).toBe("Hanya Admin yang boleh membuat snapshot.");
  });

  it("says the suite is missing on 404", () => {
    // Arrange
    const error = new ApiError(404, "SUITE_NOT_FOUND");

    // Act
    const message = mapCreateSnapshotError(error);

    // Assert
    expect(message).toBe("Suite tidak ditemukan.");
  });

  // Negative
  it("falls back to the generic message for an unmapped status", () => {
    // Arrange
    const error = new ApiError(500, "INTERNAL_ERROR");

    // Act
    const message = mapCreateSnapshotError(error);

    // Assert
    expect(message).toBe("Gagal membuat snapshot. Coba lagi.");
  });

  // Edge: a network failure is not an ApiError.
  it("falls back to the generic message when the error is not an ApiError", () => {
    // Arrange
    const error = new TypeError("Failed to fetch");

    // Act
    const message = mapCreateSnapshotError(error);

    // Assert
    expect(message).toBe("Gagal membuat snapshot. Coba lagi.");
  });

  // Edge: the code wins over the status.
  it("prefers the NOTHING_TO_SNAPSHOT code over the generic 422 handling", () => {
    // Arrange
    const error = new ApiError(422, "NOTHING_TO_SNAPSHOT", "ignored server text");

    // Act
    const message = mapCreateSnapshotError(error);

    // Assert
    expect(message).toContain("belum punya kasus yang disetujui");
  });
});
