import { ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";

export type ReviewAction = "list" | "awaitingRevision" | "submit" | "caseReview";

/** Kode dari server yang artinya sudah jelas, apa pun aksinya. */
const CODE_MESSAGE = messages({
  id: {
    COMMENT_REQUIRED: "Komentar wajib diisi saat meminta revisi.",
    ASSIGNMENT_NOT_ACTIVE: "Penugasan ini sudah diganti atau dibatalkan, jadi penilaian tidak bisa dikirim.",
    ROUND_NOT_OPEN: "Putaran tinjauan ini sedang tidak menerima penilaian.",
    VERDICT_ALREADY_SUBMITTED: "Penilaian untuk penugasan ini sudah dikirim.",
    REVIEWER_IS_AUTHOR: "Anda tidak bisa meninjau kasus yang Anda tulis.",
    NOT_YOUR_ASSIGNMENT: "Penugasan ini milik reviewer lain.",
    NO_REVIEW_ROUND: "Kasus ini belum pernah diajukan untuk ditinjau.",
  },
  en: {
    COMMENT_REQUIRED: "A comment is required when requesting revision.",
    ASSIGNMENT_NOT_ACTIVE: "This assignment was replaced or voided, so the verdict cannot be submitted.",
    ROUND_NOT_OPEN: "This review round is not accepting verdicts.",
    VERDICT_ALREADY_SUBMITTED: "A verdict for this assignment has already been submitted.",
    REVIEWER_IS_AUTHOR: "You cannot review a case you wrote.",
    NOT_YOUR_ASSIGNMENT: "This assignment belongs to another reviewer.",
    NO_REVIEW_ROUND: "This case has never been submitted for review.",
  },
});

const FORBIDDEN_MESSAGE = messages({
  id: {
    list: "Anda tidak memiliki izin untuk melihat antrean tinjauan.",
    awaitingRevision: "Anda tidak memiliki izin untuk melihat kasus yang menunggu revisi.",
    submit: "Anda tidak memiliki izin untuk menilai kasus ini.",
    caseReview: "Anda tidak memiliki izin untuk melihat penilaian kasus ini.",
  },
  en: {
    list: "You do not have permission to view the review queue.",
    awaitingRevision: "You do not have permission to view cases awaiting revision.",
    submit: "You do not have permission to review this case.",
    caseReview: "You do not have permission to view this case's review.",
  },
});

/** Hanya aksi yang menyebut satu objek yang bisa 404. Antrean selalu ada, jadi memakai pesan umum. */
const NOT_FOUND_MESSAGE = messages({
  id: {
    submit: "Penugasan tidak ditemukan atau sudah selesai.",
    caseReview: "Kasus tidak ditemukan.",
  },
  en: {
    submit: "Assignment not found or already finished.",
    caseReview: "Case not found.",
  },
});

const DEFAULT_MESSAGE = messages({
  id: {
    list: "Gagal memuat antrean tinjauan. Coba lagi.",
    awaitingRevision: "Gagal memuat kasus yang menunggu revisi. Coba lagi.",
    submit: "Gagal mengirim penilaian. Coba lagi.",
    caseReview: "Gagal memuat penilaian kasus. Coba lagi.",
  },
  en: {
    list: "Could not load the review queue. Try again.",
    awaitingRevision: "Could not load cases awaiting revision. Try again.",
    submit: "Could not submit the verdict. Try again.",
    caseReview: "Could not load the case review. Try again.",
  },
});

function knownCode(code: string, locale: Locale): string | undefined {
  const codes = text(CODE_MESSAGE, locale);
  return Object.hasOwn(codes, code) ? codes[code as keyof typeof codes] : undefined;
}

/**
 * Terjemahkan error API tinjauan menjadi satu pesan untuk pengguna.
 * Kode server dicek lebih dulu, baru status HTTP, supaya 409 yang berbeda tidak jadi satu pesan umum.
 */
export function mapReviewError(error: unknown, action: ReviewAction, locale: Locale = DEFAULT_LOCALE): string {
  const fallback = text(DEFAULT_MESSAGE, locale)[action];
  if (!(error instanceof ApiError)) return fallback;

  const byCode = knownCode(error.code, locale);
  if (byCode !== undefined) return byCode;
  if (error.status === 403) return text(FORBIDDEN_MESSAGE, locale)[action];
  if (error.status === 404) {
    const missing = text(NOT_FOUND_MESSAGE, locale);
    if (Object.hasOwn(missing, action)) return missing[action as keyof typeof missing];
  }
  return fallback;
}
