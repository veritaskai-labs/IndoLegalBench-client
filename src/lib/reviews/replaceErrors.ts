import { ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";

const DEFAULT_MESSAGE = messages({
  id: "Gagal mengganti reviewer. Coba lagi.",
  en: "Could not replace the reviewer. Try again.",
});

/**
 * Kode dari POST /reviews/{assignment_id}/replace (SCRUM-147, server PR #50).
 * Hanya kode yang benar-benar dikirim endpoint ini; kode verdict ditangani di tempat lain.
 */
const CODE_MESSAGE = messages({
  id: {
    ASSIGNMENT_ALREADY_REPLACED: "Penugasan ini sudah pernah diganti. Daftarnya dimuat ulang.",
    ROUND_ALREADY_DECIDED: "Ronde review sudah diputuskan. Daftarnya dimuat ulang.",
    CANNOT_ASSIGN_AUTHOR: "Penulis kasus tidak boleh jadi reviewer.",
    INVALID_REVIEWER: "Akun itu tidak bisa dipakai sebagai reviewer.",
    REVIEWER_ALREADY_ASSIGNED: "Reviewer itu sudah ditugaskan di ronde ini.",
    REASON_REQUIRED: "Alasan penggantian wajib diisi.",
  },
  en: {
    ASSIGNMENT_ALREADY_REPLACED: "This assignment has already been replaced. The list has been reloaded.",
    ROUND_ALREADY_DECIDED: "The review round has already been decided. The list has been reloaded.",
    CANNOT_ASSIGN_AUTHOR: "The case author cannot be a reviewer.",
    INVALID_REVIEWER: "That account cannot be used as a reviewer.",
    REVIEWER_ALREADY_ASSIGNED: "That reviewer is already assigned to this round.",
    REASON_REQUIRED: "A replacement reason is required.",
  },
});

/** Dipakai kalau kodenya belum dikenal, mengikuti deskripsi status di router server. */
const STATUS_MESSAGE = messages({
  id: {
    "403": "Hanya Admin yang boleh mengganti reviewer.",
    "404": "Penugasan atau reviewer baru tidak ditemukan. Muat ulang halaman.",
    "409": "Status penugasan sudah berubah. Daftarnya dimuat ulang.",
    "422": "Reviewer baru itu tidak boleh dipakai untuk kasus ini.",
  },
  en: {
    "403": "Only an Admin can replace a reviewer.",
    "404": "The assignment or the new reviewer was not found. Reload the page.",
    "409": "The assignment status has changed. The list has been reloaded.",
    "422": "That new reviewer cannot be used for this case.",
  },
});

function known(map: Record<string, string>, key: string): string | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

export function mapReplaceError(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const fallback = text(DEFAULT_MESSAGE, locale);
  if (!(error instanceof ApiError)) return fallback;
  return (
    known(text(CODE_MESSAGE, locale), error.code) ??
    known(text(STATUS_MESSAGE, locale), String(error.status)) ??
    fallback
  );
}

/**
 * 409 berarti yang terlihat di layar sudah basi: penugasannya sudah diganti orang lain,
 * atau rondenya sudah diputuskan. Halaman memuat ulang sendiri, admin tidak perlu refresh.
 */
export function isStaleReplace(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
