import { ApiError } from "@/lib/apiClient";

const FORBIDDEN_MESSAGE = "Anda tidak memiliki izin untuk melihat daftar jenis peraturan.";
const DEFAULT_MESSAGE = "Gagal memuat daftar jenis peraturan. Coba lagi.";

/**
 * Terjemahkan kegagalan memuat daftar jenis peraturan menjadi satu pesan untuk pengguna.
 * Pesan teknis dari server tidak ditampilkan.
 */
export function regulationTypeErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) return FORBIDDEN_MESSAGE;
  return DEFAULT_MESSAGE;
}
