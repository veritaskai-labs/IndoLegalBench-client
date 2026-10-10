import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { GENERIC_SAVE_ERROR, mapSaveError } from "./saveError";

// Bodies below are copied from the real server (local stack, 2026-09-29).
function fieldError(code: string, field: string, message: string) {
  return new ApiError(422, code, message, field);
}

describe("mapSaveError", () => {
  // Positive: AC3, duplicate case code names the owning suite.
  it("puts 409 CASE_CODE_TAKEN on the case_code field with the server message", () => {
    const error = new ApiError(
      409,
      "CASE_CODE_TAKEN",
      "Kode kasus 'SMOKE-1' sudah dipakai di suite 'test1'",
    );

    expect(mapSaveError(error)).toEqual({
      kind: "field",
      path: "case_code",
      message: "Kode kasus 'SMOKE-1' sudah dipakai di suite 'test1'",
      detail: null,
    });
  });

  // Positive: AC5, the error lands on the exact legal reference row.
  it("puts a 422 on a specific legal reference row", () => {
    const error = fieldError(
      "FIELD_REQUIRED",
      "legal_refs[1].pasal",
      "Field legal_refs[1].pasal wajib diisi",
    );

    expect(mapSaveError(error)).toEqual({
      kind: "field",
      path: "legal_refs.1.pasal",
      message: "Field legal_refs[1].pasal wajib diisi",
      detail: null,
    });
  });

  it.each([
    ["split_tag", "split_tag"],
    ["case_code", "case_code"],
    ["identity.title", "identity.title"],
    ["identity.question", "identity.question"],
    ["identity.category", "identity.category"],
    ["legal_refs[0].regulation_type", "legal_refs.0.regulation_type"],
    ["legal_refs[0].regulation_number", "legal_refs.0.regulation_number"],
    ["legal_refs[12].huruf", "legal_refs.12.huruf"],
    ["traps[0].description", "traps.0.description"],
    ["traps[3].expected_model_behavior", "traps.3.expected_model_behavior"],
    ["answer_criteria.expected_conclusion", "answer_criteria.expected_conclusion"],
    ["legal_refs", "legal_refs"],
  ])("maps server field %s to form path %s", (serverField, formPath) => {
    const result = mapSaveError(fieldError("FIELD_REQUIRED", serverField, "wajib diisi"));

    expect(result).toMatchObject({ kind: "field", path: formPath });
  });

  // Corner: phrase lists are one textarea in the form, one array on the server.
  it("puts an error on one phrase onto the whole phrase textarea", () => {
    const error = fieldError(
      "VALIDATION_ERROR",
      "answer_criteria.must_contain[2]",
      "Input should be a valid string",
    );

    expect(mapSaveError(error)).toMatchObject({
      kind: "field",
      path: "answer_criteria.must_contain",
    });
  });

  // VALIDATION_ERROR carries Pydantic's English text: show Indonesian first,
  // keep the server text as a detail.
  it("uses Indonesian copy for VALIDATION_ERROR and keeps the server text as detail", () => {
    const error = fieldError(
      "VALIDATION_ERROR",
      "legal_refs[0].year",
      "Input should be greater than or equal to 1",
    );

    expect(mapSaveError(error)).toEqual({
      kind: "field",
      path: "legal_refs.0.year",
      message: "Isian tidak valid.",
      detail: "Input should be greater than or equal to 1",
    });
  });

  // Negative: field the form does not have.
  it.each([
    "path.suite_id",
    "identity",
    "legal_refs[0]",
    "legal_refs[0].unknown",
    "traps[0].unknown",
    "legal_refs[x].pasal",
    "status",
    "",
  ])("falls back to a form-level message for unknown field %j", (serverField) => {
    const result = mapSaveError(fieldError("FIELD_REQUIRED", serverField, "wajib diisi"));

    expect(result).toEqual({ kind: "form", message: "wajib diisi" });
  });

  it("uses Indonesian copy when a known field comes without a server message", () => {
    expect(mapSaveError(new ApiError(422, "FIELD_REQUIRED", null, "traps[0].description"))).toEqual({
      kind: "field",
      path: "traps.0.description",
      message: "Isian tidak valid.",
      detail: null,
    });
  });

  it("uses a generic message when a 422 has neither field nor message", () => {
    expect(mapSaveError(new ApiError(422, "VALIDATION_ERROR"))).toEqual({
      kind: "form",
      message: GENERIC_SAVE_ERROR,
    });
  });

  it("uses a generic Indonesian message for CASE_CODE_TAKEN without a server message", () => {
    expect(mapSaveError(new ApiError(409, "CASE_CODE_TAKEN"))).toEqual({
      kind: "field",
      path: "case_code",
      message: "ID kasus sudah dipakai di suite lain.",
      detail: null,
    });
  });

  it("explains an archived suite at form level", () => {
    const error = new ApiError(422, "SUITE_NOT_ACTIVE", "Suite tidak aktif");

    expect(mapSaveError(error)).toEqual({
      kind: "form",
      message: "Suite sudah diarsipkan, jadi kasus tidak bisa disimpan.",
    });
  });

  it("tells the author to start a new version when the saved version is locked", () => {
    // Arrange
    const error = new ApiError(409, "VERSION_LOCKED", "Version is approved");

    // Act
    const result = mapSaveError(error);

    // Assert
    expect(result).toEqual({
      kind: "form",
      message: "Versi yang sudah disetujui tidak bisa diubah. Buat versi baru dulu.",
    });
  });

  it("explains a missing suite or case at form level", () => {
    expect(mapSaveError(new ApiError(404, "NOT_FOUND"))).toEqual({
      kind: "form",
      message: "Suite atau kasus tidak ditemukan.",
    });
  });

  // Negative: anything else is a generic retry message.
  it.each([
    ["an unknown error code", new ApiError(500, "SOMETHING_NEW", "Internal error")],
    ["a network failure", new TypeError("Failed to fetch")],
    ["a non-error value", "boom"],
  ])("uses the generic message for %s", (_label, error) => {
    expect(mapSaveError(error)).toEqual({ kind: "form", message: GENERIC_SAVE_ERROR });
  });
});
