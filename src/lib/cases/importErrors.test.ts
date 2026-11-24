import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { importErrorMessage, isFileRejected } from "./importErrors";

/** Whole-file rejections from server #157 (csv_import.py, import_router.py), each with its own message. */
const FILE_CODES = [
  "IMPORT_FILE_REQUIRED",
  "IMPORT_FILE_NOT_CSV",
  "IMPORT_FILE_NOT_UTF8",
  "IMPORT_FILE_TOO_LARGE",
  "IMPORT_FILE_UNREADABLE",
  "IMPORT_HEADER_MISMATCH",
  "IMPORT_FILE_EMPTY",
  "IMPORT_TOO_MANY_ROWS",
] as const;

describe("importErrorMessage", () => {
  // Positive: the server message is specific (row count, MB, Google Sheets path), so it is shown as is.
  it.each(FILE_CODES)("shows the server message for %s", (code) => {
    // Arrange
    const message = `Pesan server untuk ${code}.`;
    const error = new ApiError(422, code, message);

    // Act
    const text = importErrorMessage(error);

    // Assert
    expect(text).toBe(message);
  });

  it("keeps the row count the server put in IMPORT_TOO_MANY_ROWS", () => {
    // Arrange
    const error = new ApiError(
      422,
      "IMPORT_TOO_MANY_ROWS",
      "Berkas berisi 501 baris kasus; maksimal 500 per berkas. Pecah menjadi beberapa berkas.",
    );

    // Act
    const text = importErrorMessage(error);

    // Assert
    expect(text).toContain("501 baris");
  });

  // Edge: a known code without a message (or a blank one) still gets an Indonesian explanation.
  it.each([
    ["IMPORT_FILE_REQUIRED", "Pilih berkas CSV untuk diimpor."],
    ["IMPORT_FILE_NOT_CSV", "Berkas harus berupa .csv. Dari Google Sheets: File > Download > Comma Separated Values (.csv)."],
    ["IMPORT_FILE_NOT_UTF8", "Berkas harus berpengkodean UTF-8. Ekspor ulang dari Google Sheets."],
    ["IMPORT_FILE_TOO_LARGE", "Berkas terlalu besar. Pecah menjadi beberapa berkas."],
    ["IMPORT_FILE_UNREADABLE", "Berkas CSV rusak dan tidak bisa dibaca. Ekspor ulang dari Google Sheets."],
    ["IMPORT_HEADER_MISMATCH", "Header tidak sama dengan template. Pakai template dari sistem tanpa mengubah nama atau urutan kolom."],
    ["IMPORT_FILE_EMPTY", "Berkas tidak berisi baris kasus."],
    ["IMPORT_TOO_MANY_ROWS", "Berkas berisi lebih dari 500 baris kasus. Pecah menjadi beberapa berkas."],
    ["IMPORT_BATCH_NOT_FOUND", "Ringkasan impor tidak ditemukan."],
  ])("explains %s when the server sent no message", (code, expected) => {
    // Arrange
    const withoutMessage = new ApiError(422, code, null);
    const blankMessage = new ApiError(422, code, "   ");

    // Act / Assert
    expect(importErrorMessage(withoutMessage)).toBe(expected);
    expect(importErrorMessage(blankMessage)).toBe(expected);
  });

  // Positive: a reopened summary that no longer exists.
  it("shows the server message for IMPORT_BATCH_NOT_FOUND", () => {
    // Arrange
    const error = new ApiError(404, "IMPORT_BATCH_NOT_FOUND", "Batch impor tidak ditemukan");

    // Act / Assert
    expect(importErrorMessage(error)).toBe("Batch impor tidak ditemukan");
  });

  // Negative: a role the server refuses.
  it("explains a 403 in terms of roles, whatever the server message", () => {
    // Arrange
    const error = new ApiError(403, "FORBIDDEN", "Forbidden");

    // Act / Assert
    expect(importErrorMessage(error)).toBe("Hanya Kontributor dan Admin yang boleh mengimpor kasus.");
  });

  // Negative: a proxy limit answers 413 with an HTML page, so the body has no code.
  it("explains a 413 without a JSON body as a file that is too large", () => {
    // Arrange
    const error = new ApiError(413, "UNKNOWN_ERROR");

    // Act / Assert
    expect(importErrorMessage(error)).toBe("Berkas terlalu besar. Pecah menjadi beberapa berkas.");
  });

  // Negative: an unknown code never shows a technical server message.
  it("does not show the message of a code it does not know", () => {
    // Arrange
    const error = new ApiError(500, "internal_error", "Traceback (most recent call last) ...");

    // Act
    const text = importErrorMessage(error);

    // Assert
    expect(text).toBe("Impor gagal karena kesalahan server. Coba lagi.");
    expect(text).not.toContain("Traceback");
  });

  // Negative: fetch rejects with a TypeError when the network is down.
  it("explains a network failure and what to check before uploading again", () => {
    // Arrange
    const error = new TypeError("Failed to fetch");

    // Act / Assert
    expect(importErrorMessage(error)).toBe(
      "Tidak bisa terhubung ke server. Periksa koneksi. Bila berkas sudah sempat dikirim, mengunggah ulang aman: baris yang sudah masuk dilewati.",
    );
  });

  // Edge: anything else thrown.
  it.each([new Error("boom"), "string", null, undefined])("falls back to a generic message for %s", (error) => {
    // Arrange / Act / Assert
    expect(importErrorMessage(error)).toBe("Terjadi kesalahan. Coba lagi.");
  });
});

describe("isFileRejected (D7: whole file rejected, nothing stored)", () => {
  // Positive: every whole-file code of the server.
  it.each(FILE_CODES)("is true for 422 %s", (code) => {
    // Arrange / Act / Assert
    expect(isFileRejected(new ApiError(422, code, "pesan"))).toBe(true);
  });

  // Negative: errors that do not mean "the file was refused".
  it.each([
    ["404 batch", new ApiError(404, "IMPORT_BATCH_NOT_FOUND")],
    ["403", new ApiError(403, "FORBIDDEN")],
    ["500", new ApiError(500, "internal_error")],
    ["422 of another feature", new ApiError(422, "validation_error")],
    ["413 proxy page", new ApiError(413, "UNKNOWN_ERROR")],
    ["network", new TypeError("Failed to fetch")],
    ["anything else", new Error("boom")],
  ])("is false for %s", (_, error) => {
    // Arrange / Act / Assert
    expect(isFileRejected(error)).toBe(false);
  });

  // Edge: an IMPORT_* code with a status other than 422 is not a whole-file rejection.
  it("is false for an import code that did not come with 422", () => {
    // Arrange / Act / Assert
    expect(isFileRejected(new ApiError(400, "IMPORT_FILE_EMPTY"))).toBe(false);
  });
});
