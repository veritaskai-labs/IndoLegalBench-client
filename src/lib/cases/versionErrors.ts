import { ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";

export type VersionAction = "fork" | "history" | "compare" | "open";

const VERSION_COPY = messages({
  id: {
    locked: "Versi yang sudah disetujui tidak bisa diubah. Buat versi baru dulu.",
    inProgress: "Sudah ada versi baru yang sedang dikerjakan atau ditinjau.",
    noApproved: "Kasus ini belum punya versi yang disetujui, jadi belum bisa dibuatkan versi baru.",
    forkForbidden: "Anda tidak memiliki izin untuk membuat versi baru kasus ini.",
    historyForbidden: "Anda tidak memiliki izin untuk melihat riwayat versi kasus ini.",
    compareForbidden: "Anda tidak memiliki izin untuk membandingkan versi kasus ini.",
    openForbidden: "Anda tidak memiliki izin untuk melihat draf versi baru kasus ini.",
    caseNotFound: "Kasus tidak ditemukan.",
    compareNotFound: "Salah satu versi yang dipilih tidak ditemukan.",
    forkFallback: "Gagal membuat versi baru. Coba lagi.",
    historyFallback: "Gagal memuat riwayat versi.",
    compareFallback: "Gagal membandingkan versi. Coba lagi.",
    openFallback: "Gagal memuat draf versi baru. Coba lagi.",
    compareInvalid: "Pilih dua nomor versi yang valid untuk dibandingkan.",
  },
  en: {
    locked: "An approved version cannot be changed. Start a new version first.",
    inProgress: "A new version is already being edited or reviewed.",
    noApproved: "This case has no approved version yet, so a new version cannot be started.",
    forkForbidden: "You do not have permission to start a new version of this case.",
    historyForbidden: "You do not have permission to view this case's version history.",
    compareForbidden: "You do not have permission to compare versions of this case.",
    openForbidden: "You do not have permission to view this case's new-version draft.",
    caseNotFound: "The case was not found.",
    compareNotFound: "One of the selected versions was not found.",
    forkFallback: "Could not start a new version. Try again.",
    historyFallback: "Could not load the version history.",
    compareFallback: "Could not compare the versions. Try again.",
    openFallback: "Could not load the new-version draft. Try again.",
    compareInvalid: "Choose two valid version numbers to compare.",
  },
});

/** Dipakai juga oleh pesan simpan kasus, supaya kalimatnya satu. Indonesian, for existing imports. */
export const VERSION_LOCKED_MESSAGE = VERSION_COPY.id.locked;

export function versionLockedMessage(locale: Locale = DEFAULT_LOCALE): string {
  return text(VERSION_COPY, locale).locked;
}

/**
 * Terjemahkan error API versi menjadi satu pesan untuk pengguna.
 * Kode server dicek lebih dulu, baru status HTTP, supaya 409 yang berbeda tidak jadi satu pesan umum.
 */
export function mapVersionError(
  error: unknown,
  action: VersionAction,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const copy = text(VERSION_COPY, locale);
  const forbidden = {
    fork: copy.forkForbidden,
    history: copy.historyForbidden,
    compare: copy.compareForbidden,
    open: copy.openForbidden,
  }[action];
  const notFound = {
    fork: copy.caseNotFound,
    history: copy.caseNotFound,
    compare: copy.compareNotFound,
    open: copy.caseNotFound,
  }[action];
  const fallback = {
    fork: copy.forkFallback,
    history: copy.historyFallback,
    compare: copy.compareFallback,
    open: copy.openFallback,
  }[action];

  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "VERSION_IN_PROGRESS") return copy.inProgress;
  if (error.code === "NO_APPROVED_VERSION") return copy.noApproved;
  if (error.code === "VERSION_LOCKED") return copy.locked;
  if (error.status === 403) return forbidden;
  if (error.status === 404) return notFound;
  if (error.status === 422 && action === "compare") return copy.compareInvalid;
  return fallback;
}
