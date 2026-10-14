import { ApiError, type MissingSection } from "@/lib/apiClient";

/** Kode server yang artinya sudah jelas, dicek sebelum status HTTP. */
const CODE_MESSAGE: Record<string, string> = {
  VERSION_NOT_SUBMITTABLE: "Versi ini sedang ditinjau atau sudah disetujui.",
  SUITE_NOT_ACTIVE: "Suite ini tidak aktif, jadi kasusnya belum bisa diajukan.",
  CASE_NOT_READY: "Kasus belum lengkap. Lengkapi bagian berikut dulu.",
};

const DEFAULT_MESSAGE = "Gagal mengajukan kasus. Coba lagi.";

export function mapSubmitError(error: unknown): string {
  if (!(error instanceof ApiError)) return DEFAULT_MESSAGE;

  const byCode = CODE_MESSAGE[error.code];
  if (byCode !== undefined) return byCode;
  if (error.status === 403) return "Hanya penulis kasus ini yang bisa mengajukannya untuk direview.";
  if (error.status === 404) return "Kasus tidak ditemukan.";
  return DEFAULT_MESSAGE;
}

/** Bagian yang menghalangi pengajuan, ditampilkan satu per satu (AC1). */
export function submitBlockers(error: unknown): MissingSection[] {
  return error instanceof ApiError ? error.missing : [];
}