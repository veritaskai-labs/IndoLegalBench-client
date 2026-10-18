import { ApiError } from "@/lib/apiClient";

export type ReviewAction = "list" | "submit" | "caseReview";

/** Kode dari server yang artinya sudah jelas, apa pun aksinya. */
const CODE_MESSAGE: Record<string, string> = {
  COMMENT_REQUIRED: "Komentar wajib diisi saat meminta revisi.",
  ASSIGNMENT_NOT_ACTIVE: "Penugasan ini sudah diganti atau dibatalkan, jadi penilaian tidak bisa dikirim.",
  ROUND_NOT_OPEN: "Putaran tinjauan ini sedang tidak menerima penilaian.",
  VERDICT_ALREADY_SUBMITTED: "Penilaian untuk penugasan ini sudah dikirim.",
  REVIEWER_IS_AUTHOR: "Anda tidak bisa meninjau kasus yang Anda tulis.",
  NOT_YOUR_ASSIGNMENT: "Penugasan ini milik reviewer lain.",
  NO_REVIEW_ROUND: "Kasus ini belum pernah diajukan untuk ditinjau.",
};

const FORBIDDEN_MESSAGE: Record<ReviewAction, string> = {
  list: "Anda tidak memiliki izin untuk melihat antrean tinjauan.",
  submit: "Anda tidak memiliki izin untuk menilai kasus ini.",
  caseReview: "Anda tidak memiliki izin untuk melihat penilaian kasus ini.",
};

/** Hanya aksi yang menyebut satu objek yang bisa 404. Antrean selalu ada, jadi memakai pesan umum. */
const NOT_FOUND_MESSAGE: Partial<Record<ReviewAction, string>> = {
  submit: "Penugasan tidak ditemukan atau sudah selesai.",
  caseReview: "Kasus tidak ditemukan.",
};

const DEFAULT_MESSAGE: Record<ReviewAction, string> = {
  list: "Gagal memuat antrean tinjauan. Coba lagi.",
  submit: "Gagal mengirim penilaian. Coba lagi.",
  caseReview: "Gagal memuat penilaian kasus. Coba lagi.",
};

/**
 * Terjemahkan error API tinjauan menjadi satu pesan untuk pengguna.
 * Kode server dicek lebih dulu, baru status HTTP, supaya 409 yang berbeda tidak jadi satu pesan umum.
 */
export function mapReviewError(error: unknown, action: ReviewAction): string {
  if (!(error instanceof ApiError)) return DEFAULT_MESSAGE[action];

  const byCode = CODE_MESSAGE[error.code];
  if (byCode !== undefined) return byCode;
  if (error.status === 403) return FORBIDDEN_MESSAGE[action];
  if (error.status === 404) return NOT_FOUND_MESSAGE[action] ?? DEFAULT_MESSAGE[action];
  return DEFAULT_MESSAGE[action];
}
