import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { mapSubmitError, submitBlockers } from "./submitErrors";

describe("mapSubmitError", () => {
  // Negative
  it("explains a 403 as not being the author of this case", () => {
    expect(mapSubmitError(new ApiError(403, "FORBIDDEN"))).toBe(
      "Hanya penulis kasus ini yang bisa mengajukannya untuk direview.",
    );
  });

  // Negative
  it("explains a case that is gone", () => {
    expect(mapSubmitError(new ApiError(404, "CASE_NOT_FOUND"))).toBe("Kasus tidak ditemukan.");
  });

  // Negative: 409 punya kodenya sendiri, bukan pesan umum.
  it("explains a version that cannot be submitted again", () => {
    expect(mapSubmitError(new ApiError(409, "VERSION_NOT_SUBMITTABLE"))).toBe(
      "Versi ini sedang ditinjau atau sudah disetujui.",
    );
  });

  // Negative
  it("explains an archived suite", () => {
    expect(mapSubmitError(new ApiError(422, "SUITE_NOT_ACTIVE"))).toBe(
      "Suite ini tidak aktif, jadi kasusnya belum bisa diajukan.",
    );
  });

  // Negative
  it("asks the author to finish the case when it is not ready", () => {
    expect(mapSubmitError(new ApiError(422, "CASE_NOT_READY"))).toBe(
      "Kasus belum lengkap. Lengkapi bagian berikut dulu.",
    );
  });

  // Corner
  it("falls back to a general message for anything else", () => {
    expect(mapSubmitError(new Error("boom"))).toBe("Gagal mengajukan kasus. Coba lagi.");
  });
});

describe("submitBlockers", () => {

  it("hands back the missing sections of a CASE_NOT_READY", () => {
    const error = new ApiError(422, "CASE_NOT_READY", null, null, [
      { field: "legal_refs", message: "Minimal satu rujukan hukum" },
      { field: "split_tag", message: "Tag dataset belum dipilih" },
    ]);

    expect(submitBlockers(error)).toEqual([
      { field: "legal_refs", message: "Minimal satu rujukan hukum" },
      { field: "split_tag", message: "Tag dataset belum dipilih" },
    ]);
  });

  // Corner
  it("is empty for an error that carries no sections", () => {
    expect(submitBlockers(new ApiError(403, "FORBIDDEN"))).toEqual([]);
    expect(submitBlockers(new Error("boom"))).toEqual([]);
  });
});