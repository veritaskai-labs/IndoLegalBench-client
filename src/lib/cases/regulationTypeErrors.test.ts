import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { regulationTypeErrorMessage } from "./regulationTypeErrors";

const DEFAULT_MESSAGE = "Gagal memuat daftar jenis peraturan. Coba lagi.";

describe("regulationTypeErrorMessage", () => {
  // Positive
  it("tells the user they lack permission on a 403", () => {
    // Act
    const message = regulationTypeErrorMessage(new ApiError(403, "FORBIDDEN"));

    // Assert
    expect(message).toBe("Anda tidak memiliki izin untuk melihat daftar jenis peraturan.");
  });

  // Negative
  it.each([
    [401, "UNAUTHENTICATED"],
    [404, "NOT_FOUND"],
    [500, "INTERNAL_ERROR"],
    [503, "UNAVAILABLE"],
  ])("falls back to the general message on a %i", (status, code) => {
    // Act
    const message = regulationTypeErrorMessage(new ApiError(status, code));

    // Assert
    expect(message).toBe(DEFAULT_MESSAGE);
  });

  // Edge
  it.each([
    ["a network failure", new TypeError("Failed to fetch")],
    ["a string", "boom"],
    ["undefined", undefined],
  ])("falls back to the general message for %s", (_name, error) => {
    // Act
    const message = regulationTypeErrorMessage(error);

    // Assert
    expect(message).toBe(DEFAULT_MESSAGE);
  });

  it("does not show the server message to the user", () => {
    // Arrange
    const error = new ApiError(500, "INTERNAL_ERROR", "Traceback: secret detail");

    // Act
    const message = regulationTypeErrorMessage(error);

    // Assert
    expect(message).not.toContain("secret detail");
  });
});
