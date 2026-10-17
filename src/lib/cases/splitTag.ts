import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { CaseRead, SplitTag } from "@/types/case";

/** Label tag dev/test untuk badge dan pilihan di dialog. */
export const SPLIT_TAG_LABEL: Record<SplitTag, string> = { dev: "Dev", test: "Test" };

/** Dev ke test: kasusnya sudah pernah terlihat developer AI, jadi perlu peringatan (PBI-9 AC3). */
export function isDevToTest(from: SplitTag, to: SplitTag): boolean {
  return from === "dev" && to === "test";
}

type VersionState = Pick<CaseRead, "status" | "version">;

/**
 * Setelah kasus pernah disetujui, tag bukan lagi milik penulis (PBI-9 AC3): server menolak
 * perubahan lewat PUT dengan SPLIT_TAG_LOCKED. Versi di atas 1 selalu dibuat dari versi yang
 * disetujui (SCRUM-136), jadi draf versi berikutnya juga terkunci.
 */
export function isTagLockedInEditor({ status, version }: VersionState): boolean {
  return status === "approved" || version > 1;
}

/** Tombol "Ubah tag" hanya untuk Admin, dan hanya setelah kasus disetujui. Server tetap yang memutuskan. */
export function canChangeTagAsAdmin(role: Role | null, saved: VersionState): boolean {
  return role === "admin" && isTagLockedInEditor(saved);
}

const CODE_MESSAGE: Record<string, string> = {
  TAG_CHANGE_NEEDS_CONFIRMATION:
    "Kasus ini sudah pernah dipakai sebagai dev set. Centang konfirmasi untuk tetap memindahkannya ke test.",
  NO_APPROVED_VERSION: "Kasus ini belum disetujui. Sebelum disetujui, tag diubah penulisnya di editor.",
  SUITE_NOT_ACTIVE: "Suite kasus ini sedang diarsipkan, jadi tag tidak bisa diubah.",
};

/** Terjemahkan error PATCH split-tag menjadi satu pesan untuk Admin. Kode server dicek lebih dulu. */
export function splitTagErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const byCode = CODE_MESSAGE[error.code];
    if (byCode !== undefined) return byCode;
    if (error.status === 403) return "Hanya Admin yang bisa mengubah tag kasus yang sudah disetujui.";
    if (error.status === 404) return "Kasus tidak ditemukan.";
  }
  return "Gagal mengubah tag. Coba lagi.";
}
