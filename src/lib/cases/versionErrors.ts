import { ApiError } from "@/lib/apiClient";

export type VersionAction = "fork" | "history" | "compare";

/** Dipakai juga oleh pesan simpan kasus, supaya kalimatnya satu. */
export const VERSION_LOCKED_MESSAGE = "Versi yang sudah disetujui tidak bisa diubah. Buat versi baru dulu.";

/** Kode 409 dari server yang artinya sudah jelas, apa pun aksinya. */
const CODE_MESSAGE: Record<string, string> = {
  VERSION_IN_PROGRESS: "Sudah ada versi baru yang sedang dikerjakan atau ditinjau.",
  NO_APPROVED_VERSION: "Kasus ini belum punya versi yang disetujui, jadi belum bisa dibuatkan versi baru.",
  VERSION_LOCKED: VERSION_LOCKED_MESSAGE,
};

const FORBIDDEN_MESSAGE: Record<VersionAction, string> = {
  fork: "Anda tidak memiliki izin untuk membuat versi baru kasus ini.",
  history: "Anda tidak memiliki izin untuk melihat riwayat versi kasus ini.",
  compare: "Anda tidak memiliki izin untuk membandingkan versi kasus ini.",
};

const CASE_NOT_FOUND = "Kasus tidak ditemukan.";

const NOT_FOUND_MESSAGE: Record<VersionAction, string> = {
  fork: CASE_NOT_FOUND,
  history: CASE_NOT_FOUND,
  compare: "Salah satu versi yang dipilih tidak ditemukan.",
};

const DEFAULT_MESSAGE: Record<VersionAction, string> = {
  fork: "Gagal membuat versi baru. Coba lagi.",
  history: "Gagal memuat riwayat versi.",
  compare: "Gagal membandingkan versi. Coba lagi.",
};

/**
 * Terjemahkan error API versi menjadi satu pesan untuk pengguna.
 * Kode server dicek lebih dulu, baru status HTTP, supaya 409 yang berbeda tidak jadi satu pesan umum.
 */
export function mapVersionError(error: unknown, action: VersionAction): string {
  if (!(error instanceof ApiError)) return DEFAULT_MESSAGE[action];

  const byCode = CODE_MESSAGE[error.code];
  if (byCode !== undefined) return byCode;
  if (error.status === 403) return FORBIDDEN_MESSAGE[action];
  if (error.status === 404) return NOT_FOUND_MESSAGE[action];
  if (error.status === 422 && action === "compare") {
    return "Pilih dua nomor versi yang valid untuk dibandingkan.";
  }
  return DEFAULT_MESSAGE[action];
}
