import { ApiError } from "@/lib/apiClient";

const DEFAULT_MESSAGE = "Gagal mengganti reviewer. Coba lagi.";

/**
 * Kode dari POST /reviews/{assignment_id}/replace (SCRUM-147, server PR #50).
 * Hanya kode yang benar-benar dikirim endpoint ini; kode verdict ditangani di tempat lain.
 */
const CODE_MESSAGE: Record<string, string> = {
  ASSIGNMENT_ALREADY_REPLACED:
    "Penugasan ini sudah pernah diganti. Daftarnya dimuat ulang.",
  ROUND_ALREADY_DECIDED:
    "Ronde review sudah diputuskan. Daftarnya dimuat ulang.",
  CANNOT_ASSIGN_AUTHOR: "Penulis kasus tidak boleh jadi reviewer.",
  INVALID_REVIEWER: "Akun itu tidak bisa dipakai sebagai reviewer.",
  REVIEWER_ALREADY_ASSIGNED: "Reviewer itu sudah ditugaskan di ronde ini.",
  REASON_REQUIRED: "Alasan penggantian wajib diisi.",
};

/** Dipakai kalau kodenya belum dikenal, mengikuti deskripsi status di router server. */
const STATUS_MESSAGE: Record<number, string> = {
  403: "Hanya Admin yang boleh mengganti reviewer.",
  404: "Penugasan atau reviewer baru tidak ditemukan. Muat ulang halaman.",
  409: "Status penugasan sudah berubah. Daftarnya dimuat ulang.",
  422: "Reviewer baru itu tidak boleh dipakai untuk kasus ini.",
};

export function mapReplaceError(error: unknown): string {
  if (!(error instanceof ApiError)) return DEFAULT_MESSAGE;
  return (
    CODE_MESSAGE[error.code] ?? STATUS_MESSAGE[error.status] ?? DEFAULT_MESSAGE
  );
}

/**
 * 409 berarti yang terlihat di layar sudah basi: penugasannya sudah diganti orang lain,
 * atau rondenya sudah diputuskan. Halaman memuat ulang sendiri, admin tidak perlu refresh.
 */
export function isStaleReplace(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}