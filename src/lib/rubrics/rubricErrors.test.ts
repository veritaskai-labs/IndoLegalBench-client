import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { createErrorMessage, fieldErrorOf, loadErrorMessage } from "./rubricErrors";

function apiError(status: number, serverMessage: string | null = null, field: string | null = null) {
  return new ApiError(status, "SOME_CODE", serverMessage, field);
}

describe("createErrorMessage (POST /admin/rubrics)", () => {
  // Positive: the server says exactly which rule failed, so the Admin reads that.
  it("shows the server message on a 422", () => {
    // Arrange
    const error = apiError(422, "Bobot harus berjumlah 100");

    // Act
    const message = createErrorMessage(error);

    // Assert
    expect(message).toBe("Bobot harus berjumlah 100");
  });

  it("explains a role change on a 403", () => {
    // Arrange
    const error = apiError(403);

    // Act
    const message = createErrorMessage(error);

    // Assert
    expect(message).toBe("Peran Anda tidak lagi boleh membuat versi rubrik. Muat ulang halaman.");
  });

  it("uses the server message on a 409 when there is one", () => {
    // Arrange
    const error = apiError(409, "Nomor versi sudah dipakai");

    // Act
    const message = createErrorMessage(error);

    // Assert
    expect(message).toBe("Nomor versi sudah dipakai");
  });

  // Edge: a 422 or 409 without a usable message still tells the Admin what to do.
  it.each([
    [422, null, "Isian rubrik belum valid. Periksa kembali isian yang ditandai."],
    [422, "", "Isian rubrik belum valid. Periksa kembali isian yang ditandai."],
    [422, "   ", "Isian rubrik belum valid. Periksa kembali isian yang ditandai."],
    [409, null, "Versi rubrik bentrok dengan versi lain. Muat ulang daftar lalu coba lagi."],
  ])("falls back to a plain message on %i with message %j", (status, serverMessage, expected) => {
    // Arrange
    const error = apiError(status, serverMessage);

    // Act
    const message = createErrorMessage(error);

    // Assert
    expect(message).toBe(expected);
  });

  // Negative: anything else, including a network failure, is a retryable generic failure.
  it.each([[apiError(500)], [new TypeError("Failed to fetch")], ["bukan error"], [null]])(
    "gives the generic message for %j",
    (error) => {
      // Arrange / Act
      const message = createErrorMessage(error);

      // Assert
      expect(message).toBe("Versi rubrik gagal disimpan. Coba lagi.");
    },
  );
});

describe("loadErrorMessage", () => {
  it("is one plain message whatever failed", () => {
    // Arrange
    const error = apiError(500);

    // Act
    const message = loadErrorMessage(error);

    // Assert
    expect(message).toBe("Gagal memuat daftar versi rubrik. Coba lagi.");
  });
});

describe("fieldErrorOf (422 next to the input)", () => {
  // Positive: the form shows the message beside the field the server named.
  it("returns the field and message of a 422", () => {
    // Arrange
    const error = apiError(422, "Bobot harus berjumlah 100", "aspects[0].weight");

    // Act
    const result = fieldErrorOf(error);

    // Assert
    expect(result).toEqual({ field: "aspects[0].weight", message: "Bobot harus berjumlah 100" });
  });

  // The rubric rules of the server write the position with dots (aspects.0.name); the form's inputs use brackets.
  it.each([
    ["aspects.0.name", "aspects[0].name"],
    ["aspects.12.weight", "aspects[12].weight"],
    ["levels.1.score", "levels[1].score"],
    ["levels.0.descriptors.1.aspect_name", "levels[0].descriptors[1].aspect_name"],
  ])("writes the server position %s as %s", (serverField, formField) => {
    // Arrange
    const error = apiError(422, "Nama dimensi sudah dipakai di versi ini.", serverField);

    // Act
    const result = fieldErrorOf(error);

    // Assert
    expect(result).toEqual({ field: formField, message: "Nama dimensi sudah dipakai di versi ini." });
  });

  // Edge: fields without a position, and positions already in brackets, stay as they are.
  it.each(["effective_date", "aspects", "levels", "aspects[0].weight"])("keeps %s unchanged", (field) => {
    // Arrange
    const error = apiError(422, "Pesan", field);

    // Act
    const result = fieldErrorOf(error);

    // Assert
    expect(result?.field).toBe(field);
  });

  // Negative: without a field or a message there is nothing to place beside an input.
  it.each([
    ["a 422 without a field", apiError(422, "Pesan", null)],
    ["a 422 without a message", apiError(422, null, "aspects[0].name")],
    ["a 422 with a blank message", apiError(422, "  ", "aspects[0].name")],
    ["a 409", apiError(409, "Pesan", "aspects[0].name")],
    ["a plain Error", new Error("x")],
    ["null", null],
  ])("returns null for %s", (_name, error) => {
    // Arrange / Act
    const result = fieldErrorOf(error);

    // Assert
    expect(result).toBeNull();
  });
});
