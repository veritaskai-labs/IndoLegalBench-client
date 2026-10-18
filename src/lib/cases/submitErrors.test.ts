import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { isStaleSubmit, mapSubmitError, submitBlockers } from "./submitErrors";

describe("mapSubmitError", () => {
  // Negative
  it("explains a 403 as not being the author of this case", () => {
    expect(mapSubmitError(new ApiError(403, "FORBIDDEN"))).toBe(
      "Hanya penulis kasus ini yang bisa mengajukannya untuk direview.",
    );
  });

  // Negative
  it("explains a case that is gone", () => {
    expect(mapSubmitError(new ApiError(404, "CASE_NOT_FOUND"))).toBe(
      "Kasus tidak ditemukan.",
    );
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
    expect(mapSubmitError(new Error("boom"))).toBe(
      "Gagal mengajukan kasus. Coba lagi.",
    );
  });
  // Negative: 409 kedua dari server #49 — mengulang pengajuan tidak akan pernah menolong.
  it("explains a version with no revise decision yet", () => {
    expect(mapSubmitError(new ApiError(409, "ROUND_NOT_REVISED"))).toBe(
      "Kasus ini belum bisa diajukan ulang karena belum ada putusan revisi. Hubungi Admin.",
    );
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

  // Corner: ApiError dengan kode dan status yang belum dipetakan tetap dapat pesan umum.
  it("falls back for an ApiError nobody mapped", () => {
    expect(mapSubmitError(new ApiError(500, "INTERNAL_ERROR"))).toBe(
      "Gagal mengajukan kasus. Coba lagi.",
    );
  });
  // Negative: koneksi putus memberi TypeError, bukan ApiError, jadi tidak ada bagian yang bisa didaftar.
  it("hands back nothing when the failure is not an ApiError", () => {
    expect(submitBlockers(new TypeError("Failed to fetch"))).toEqual([]);
  });

  describe("isStaleSubmit", () => {
  // Positive: versi sudah diajukan dari tempat lain, jadi halaman perlu dibaca ulang.
  it("recognises a version that cannot be submitted again", () => {
    expect(isStaleSubmit(new ApiError(409, "VERSION_NOT_SUBMITTABLE"))).toBe(
      true,
    );
  });

  // Negative: kegagalan lain tidak berarti statusnya basi.
  it("leaves another ApiError alone", () => {
    expect(isStaleSubmit(new ApiError(422, "SUITE_NOT_ACTIVE"))).toBe(false);
  });

  // Corner: koneksi putus bukan ApiError.
  it("leaves a failure that is not an ApiError alone", () => {
    expect(isStaleSubmit(new TypeError("Failed to fetch"))).toBe(false);
  });
});
  // Negative: 409 yang ini bukan status basi — membaca ulang kasusnya tidak mengubah apa pun.
  it("leaves a 409 that is not about the version alone", () => {
    expect(isStaleSubmit(new ApiError(409, "ROUND_NOT_REVISED"))).toBe(false);
  });
});
