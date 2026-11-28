import { ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import type { Role } from "@/types";
import type { SessionDetail } from "@/types/measurement";

type AcceptState = Pick<SessionDetail, "status" | "accepted_as_is_at">;

/**
 * Tombol Terima apa adanya hanya untuk yang akan diterima server (PBI-12 AC9, server#97):
 * Admin, pada sesi yang selesai dengan kegagalan dan belum diterima. Server tetap yang menolak
 * (403/409).
 */
export function canAcceptAsIs(session: AcceptState, role: Role | null): boolean {
  return role === "admin" && session.status === "finished_with_failures" && session.accepted_as_is_at === null;
}

/** Hapus tanda: Admin, pada sesi yang sudah diterima; setelahnya sesi bisa dicoba ulang lagi. */
export function canClearAcceptAsIs(session: AcceptState, role: Role | null): boolean {
  return role === "admin" && session.accepted_as_is_at !== null;
}

// Spasi, tab, baris baru dan NBSP (\s), ditambah karakter lebar nol yang tidak terlihat.
const INVISIBLE = /[\s\u200B-\u200D\uFEFF]/g;

/** Alasan tertulis wajib (AC9): harus ada sesuatu yang bisa dibaca orang lain. */
export function isReasonWritten(reason: string): boolean {
  return reason.replace(INVISIBLE, "") !== "";
}

const ACCEPT_ERRORS = messages({
  id: {
    REASON_REQUIRED: "Tulis alasan menerima sesi ini.",
    ALREADY_ACCEPTED: "Sesi ini sudah diterima apa adanya. Muat ulang halaman.",
    SESSION_NOT_ACCEPTABLE: "Hanya sesi yang selesai dengan kegagalan yang bisa diterima apa adanya.",
    NOT_ACCEPTED: "Sesi ini belum diterima apa adanya. Muat ulang halaman.",
    MEASUREMENT_NOT_FOUND: "Sesi tidak ditemukan. Muat ulang halaman.",
    // Aksi kontrol memakai silentForbidden, jadi 403 (peran berubah saat halaman terbuka) sampai di sini.
    FORBIDDEN: "Hanya Admin yang bisa mengubah tanda terima apa adanya. Muat ulang halaman.",
    fallback: "Permintaan gagal. Coba lagi.",
  },
  en: {
    REASON_REQUIRED: "Write a reason for accepting this session.",
    ALREADY_ACCEPTED: "This session is already accepted as-is. Reload the page.",
    SESSION_NOT_ACCEPTABLE: "Only a session that finished with failures can be accepted as-is.",
    NOT_ACCEPTED: "This session has not been accepted as-is. Reload the page.",
    MEASUREMENT_NOT_FOUND: "Session not found. Reload the page.",
    FORBIDDEN: "Only an Admin can change the accepted-as-is mark. Reload the page.",
    fallback: "The request failed. Try again.",
  },
});

export function acceptErrorMessage(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(ACCEPT_ERRORS, locale);
  const known =
    error instanceof ApiError && error.code !== "fallback" && Object.hasOwn(copy, error.code)
      ? copy[error.code as keyof typeof copy]
      : undefined;
  return known ?? copy.fallback;
}
