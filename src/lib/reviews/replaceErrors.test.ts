import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { mapReplaceError } from "./replaceErrors";

describe("mapReplaceError", () => {
  // Positif
  it("uses the server code when it knows it", () => {
    expect(mapReplaceError(new ApiError(409, "ROUND_NOT_OPEN"))).toBe(
      "Ronde review sudah diputuskan. Muat ulang halaman.",
    );
    expect(mapReplaceError(new ApiError(409, "ASSIGNMENT_NOT_ACTIVE"))).toBe(
      "Penugasan ini sudah pernah diganti. Muat ulang halaman.",
    );
    expect(mapReplaceError(new ApiError(422, "REVIEWER_IS_AUTHOR"))).toBe(
      "Penulis kasus tidak boleh jadi reviewer.",
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