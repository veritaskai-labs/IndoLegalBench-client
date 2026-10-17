import { ApiError } from "@/lib/apiClient";

const DEFAULT_MESSAGE = "Gagal mengganti reviewer. Coba lagi.";

/**
 * Kode dari POST /reviews/{assignment_id}/replace (SCRUM-147).
 * Kode baru dari server = satu baris di sini, tanpa menyentuh dialognya.
 */
const CODE_MESSAGE: Record<string, string> = {
  ROUND_NOT_OPEN: "Ronde review sudah diputuskan. Muat ulang halaman.",
  ASSIGNMENT_NOT_ACTIVE:
    "Penugasan ini sudah pernah diganti. Muat ulang halaman.",
  ASSIGNMENT_NOT_FOUND: "Penugasan tidak ditemukan. Muat ulang halaman.",
  REVIEWER_NOT_FOUND: "Reviewer baru tidak ditemukan.",
  REVIEWER_IS_AUTHOR: "Penulis kasus tidak boleh jadi reviewer.",
  REVIEWER_ALREADY_ASSIGNED: "Reviewer itu sudah ditugaskan di ronde ini.",
  REVIEWER_NOT_ACTIVE: "Akun reviewer itu tidak aktif.",
  REASON_REQUIRED: "Alasan penggantian wajib diisi.",
};

/** Dipakai kalau kodenya belum dikenal, mengikuti deskripsi status di router server. */
const STATUS_MESSAGE: Record<number, string> = {
  403: "Hanya Admin yang boleh mengganti reviewer.",
  404: "Penugasan atau reviewer baru tidak ditemukan. Muat ulang halaman.",
  409: "Status penugasan sudah berubah. Muat ulang halaman.",
  422: "Reviewer baru itu tidak boleh dipakai untuk kasus ini.",
};

export function mapReplaceError(error: unknown): string {
  if (!(error instanceof ApiError)) return DEFAULT_MESSAGE;
  return (
    CODE_MESSAGE[error.code] ?? STATUS_MESSAGE[error.status] ?? DEFAULT_MESSAGE
  );
}