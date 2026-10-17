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

  // Positive: AC8, the error lands on the exact link of the exact legal reference.
  it("puts a 422 on a specific link of a specific legal reference", () => {
    // Arrange
    const error = fieldError(
      "FIELD_REQUIRED",
      "legal_refs[1].links[0].pasal",
      "Field legal_refs[1].links[0].pasal wajib diisi",
    );

    // Act
    const result = mapSaveError(error);

    // Assert
    expect(result).toEqual({
      kind: "field",
      path: "legal_refs.1.links.0.pasal",
      message: "Field legal_refs[1].links[0].pasal wajib diisi",
      detail: null,
    });
  });

  it.each([
    [
      "FIELD_NOT_ALLOWED",
      "legal_refs[0].links[0].angka",
      "Field legal_refs[0].links[0].angka tidak boleh diisi",
    ],
    [
      "CONNECTOR_INVALID",
      "legal_refs[0].links[1].connector",
      "Peraturan ke-2 wajib disambung dengan jo. atau jis.",
    ],
    ["YEAR_IN_FUTURE", "legal_refs[0].links[0].year", "Tahun tidak boleh melewati 2026"],
    [
      "REGULATION_TYPE_UNKNOWN",
      "legal_refs[0].links[0].regulation_type",
      "Jenis peraturan tidak ada di daftar",
    ],
    [
      "REGULATION_TYPE_INACTIVE",
      "legal_refs[0].links[0].regulation_type",
      "Jenis peraturan sudah tidak dipakai",
    ],
  ])("shows the server message of %s on its field", (code, serverField, message) => {
    // Act
    const result = mapSaveError(fieldError(code, serverField, message));

    // Assert
    expect(result).toMatchObject({ kind: "field", message, detail: null });
  });

  it.each([
    ["split_tag", "split_tag"],
    ["case_code", "case_code"],
    ["identity.title", "identity.title"],
    ["identity.question", "identity.question"],
    ["identity.category", "identity.category"],
    ["legal_refs[0].links[0].form", "legal_refs.0.links.0.form"],
    ["legal_refs[0].links[0].connector", "legal_refs.0.links.0.connector"],
    ["legal_refs[0].links[0].regulation_type", "legal_refs.0.links.0.regulation_type"],
    ["legal_refs[0].links[0].number", "legal_refs.0.links.0.number"],
    ["legal_refs[0].links[0].year", "legal_refs.0.links.0.year"],
    ["legal_refs[0].links[0].about", "legal_refs.0.links.0.about"],
    ["legal_refs[0].links[0].pasal", "legal_refs.0.links.0.pasal"],
    ["legal_refs[0].links[0].angka", "legal_refs.0.links.0.angka"],
    ["legal_refs[0].links[0].ayat", "legal_refs.0.links.0.ayat"],
    ["legal_refs[12].links[3].huruf", "legal_refs.12.links.3.huruf"],
    ["legal_refs[0].kind", "legal_refs.0.kind"],
    ["legal_refs[0].free_text", "legal_refs.0.free_text"],
    ["legal_refs[0].links", "legal_refs.0.links"],
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
      "legal_refs[0].links[0].year",
      "Input should be greater than or equal to 1",
    );

    expect(mapSaveError(error)).toEqual({
      kind: "field",
      path: "legal_refs.0.links.0.year",
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
    "legal_refs[0].links[0].unknown",
    "legal_refs[0].links[1]",
    "legal_refs[0].links[x].pasal",
    "traps[0].unknown",
    "legal_refs[x].links[0].pasal",
    // Sprint 1 field names that the form no longer has
    "legal_refs[0].pasal",
    "legal_refs[0].regulation_number",
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

  // Positive: a new draft of an approved case keeps its case code; the server answers 409.
  it("puts 409 CASE_CODE_LOCKED on the case_code field with the server message", () => {
    // Arrange
    const error = new ApiError(
      409,
      "CASE_CODE_LOCKED",
      "Kode kasus tidak bisa diubah setelah ada versi yang disetujui",
    );

    // Act
    const result = mapSaveError(error);

    // Assert
    expect(result).toEqual({
      kind: "field",
      path: "case_code",
      message: "Kode kasus tidak bisa diubah setelah ada versi yang disetujui",
      detail: null,
    });
  });

  it("uses an Indonesian message for CASE_CODE_LOCKED without a server message", () => {
    // Arrange
    const error = new ApiError(409, "CASE_CODE_LOCKED");

    // Act
    const result = mapSaveError(error);

    // Assert
    expect(result).toEqual({
      kind: "field",
      path: "case_code",
      message: "ID kasus tidak bisa diubah setelah kasus pernah disetujui.",
      detail: null,
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

describe("mapSaveError split tag (review of #30)", () => {
  it("asks for a reload, above the form, when an Admin changed the tag meanwhile", () => {
    // Arrange: 409, so the global 403 handler does not move the author to /forbidden
    const error = new ApiError(409, "SPLIT_TAG_LOCKED", "server text");

    // Act
    const result = mapSaveError(error);

    // Assert
    expect(result).toEqual({
      kind: "form",
      message: "Tag kasus ini baru saja diubah Admin. Muat ulang halaman lalu simpan lagi.",
    });
  });
});
