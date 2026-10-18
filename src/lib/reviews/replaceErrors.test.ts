import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { isStaleReplace, mapReplaceError } from "./replaceErrors";

describe("mapReplaceError", () => {
  // Positif: kode yang benar-benar dikirim replace (server PR #50).
  it("uses the server code when it knows it", () => {
    expect(
      mapReplaceError(new ApiError(409, "ASSIGNMENT_ALREADY_REPLACED")),
    ).toBe("Penugasan ini sudah pernah diganti. Daftarnya dimuat ulang.");
    expect(mapReplaceError(new ApiError(409, "ROUND_ALREADY_DECIDED"))).toBe(
      "Ronde review sudah diputuskan. Daftarnya dimuat ulang.",
    );
    expect(mapReplaceError(new ApiError(422, "CANNOT_ASSIGN_AUTHOR"))).toBe(
      "Penulis kasus tidak boleh jadi reviewer.",
    );
    expect(mapReplaceError(new ApiError(422, "INVALID_REVIEWER"))).toBe(
      "Akun itu tidak bisa dipakai sebagai reviewer.",
    );
    expect(
      mapReplaceError(new ApiError(422, "REVIEWER_ALREADY_ASSIGNED")),
    ).toBe("Reviewer itu sudah ditugaskan di ronde ini.");
    expect(mapReplaceError(new ApiError(422, "REASON_REQUIRED"))).toBe(
      "Alasan penggantian wajib diisi.",
    );
  });

  // Negatif
  it("falls back to the status when the code is new", () => {
    expect(mapReplaceError(new ApiError(403, "SOMETHING_NEW"))).toBe(
      "Hanya Admin yang boleh mengganti reviewer.",
    );
    expect(mapReplaceError(new ApiError(404, "SOMETHING_NEW"))).toBe(
      "Penugasan atau reviewer baru tidak ditemukan. Muat ulang halaman.",
    );
    expect(mapReplaceError(new ApiError(422, "SOMETHING_NEW"))).toBe(
      "Reviewer baru itu tidak boleh dipakai untuk kasus ini.",
    );
  });

  // corner
  it("gives one safe message for anything else", () => {
    expect(mapReplaceError(new ApiError(500, "INTERNAL_ERROR"))).toBe(
      "Gagal mengganti reviewer. Coba lagi.",
    );
    expect(mapReplaceError(new Error("offline"))).toBe(
      "Gagal mengganti reviewer. Coba lagi.",
    );
    expect(mapReplaceError(null)).toBe("Gagal mengganti reviewer. Coba lagi.");
  });
});

describe("isStaleReplace", () => {
  // Positif: dua galat 409 artinya layar sudah ketinggalan.
  it("is true for both conflicts", () => {
    expect(isStaleReplace(new ApiError(409, "ASSIGNMENT_ALREADY_REPLACED"))).toBe(
      true,
    );
    expect(isStaleReplace(new ApiError(409, "ROUND_ALREADY_DECIDED"))).toBe(true);
  });

  // Negatif: yang masih bisa diperbaiki admin di dialog bukan data basi.
  it("is false for an error the admin can fix in the dialog", () => {
    expect(isStaleReplace(new ApiError(422, "REASON_REQUIRED"))).toBe(false);
  });

  // corner
  it("is false for anything that is not an ApiError", () => {
    expect(isStaleReplace(new Error("offline"))).toBe(false);
  });
});