import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { SessionStatus } from "@/types/measurement";

/**
 * Tombol Terima apa adanya hanya untuk yang akan diterima server (PBI-12 AC9, server#97):
 * Admin, pada sesi yang selesai dengan kegagalan. Server tetap yang menolak (403/409).
 */
export function canAcceptAsIs(status: SessionStatus, role: Role | null): boolean {
  return role === "admin" && status === "finished_with_failures";
}

// Spasi, tab, baris baru dan NBSP (\s), ditambah karakter lebar nol yang tidak terlihat.
const INVISIBLE = /[\s​-‍﻿]/g;

/** Alasan tertulis wajib (AC9): harus ada sesuatu yang bisa dibaca orang lain. */
export function isReasonWritten(reason: string): boolean {
  return reason.replace(INVISIBLE, "") !== "";
}

const ACCEPT_ERRORS: Record<string, string> = {
  REASON_REQUIRED: "Tulis alasan menerima sesi ini.",
  ALREADY_ACCEPTED: "Sesi ini sudah diterima apa adanya. Muat ulang halaman.",
  SESSION_NOT_ACCEPTABLE: "Hanya sesi yang selesai dengan kegagalan yang bisa diterima apa adanya.",
  NOT_ACCEPTED: "Sesi ini belum diterima apa adanya. Muat ulang halaman.",
  MEASUREMENT_NOT_FOUND: "Sesi tidak ditemukan. Muat ulang halaman.",
  // Aksi kontrol memakai silentForbidden, jadi 403 (peran berubah saat halaman terbuka) sampai di sini.
  FORBIDDEN: "Hanya Admin yang bisa menerima sesi apa adanya. Muat ulang halaman.",
};

export function acceptErrorMessage(error: unknown): string {
  const known = error instanceof ApiError ? ACCEPT_ERRORS[error.code] : undefined;
  return known ?? "Permintaan gagal. Coba lagi.";
}
