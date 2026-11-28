import { ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import type { Role } from "@/types";
import type { CaseRead, SplitTag } from "@/types/case";

const SPLIT_TAG_TEXT = messages<Record<SplitTag, string>>({
  id: { dev: "Dev set", test: "Test set" },
  en: { dev: "Dev set", test: "Test set" },
});

/** Label tag dev/test untuk badge dan pilihan di dialog. Indonesian, for existing imports. */
export const SPLIT_TAG_LABEL: Record<SplitTag, string> = SPLIT_TAG_TEXT.id;

export function splitTagLabel(tag: SplitTag, locale: Locale = DEFAULT_LOCALE): string {
  return text(SPLIT_TAG_TEXT, locale)[tag];
}

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

const SPLIT_TAG_ERROR = messages({
  id: {
    needsConfirmation:
      "Kasus ini sudah pernah dipakai sebagai dev set. Centang konfirmasi untuk tetap memindahkannya ke test.",
    notApproved: "Kasus ini belum disetujui. Sebelum disetujui, tag diubah penulisnya di editor.",
    suiteArchived: "Suite kasus ini sedang diarsipkan, jadi tag tidak bisa diubah.",
    forbidden: "Hanya Admin yang bisa mengubah tag kasus yang sudah disetujui.",
    notFound: "Kasus tidak ditemukan.",
    fallback: "Gagal mengubah tag. Coba lagi.",
  },
  en: {
    needsConfirmation:
      "This case has already been used as a dev set. Tick the confirmation to move it to test anyway.",
    notApproved: "This case is not approved yet. Before approval, its author changes the tag in the editor.",
    suiteArchived: "This case's suite is archived, so the tag cannot be changed.",
    forbidden: "Only an admin can change the tag of an approved case.",
    notFound: "The case was not found.",
    fallback: "Could not change the tag. Try again.",
  },
});

/** Terjemahkan error PATCH split-tag menjadi satu pesan untuk Admin. Kode server dicek lebih dulu. */
export function splitTagErrorMessage(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(SPLIT_TAG_ERROR, locale);
  if (error instanceof ApiError) {
    if (error.code === "TAG_CHANGE_NEEDS_CONFIRMATION") return copy.needsConfirmation;
    if (error.code === "NO_APPROVED_VERSION") return copy.notApproved;
    if (error.code === "SUITE_NOT_ACTIVE") return copy.suiteArchived;
    if (error.status === 403) return copy.forbidden;
    if (error.status === 404) return copy.notFound;
  }
  return copy.fallback;
}
