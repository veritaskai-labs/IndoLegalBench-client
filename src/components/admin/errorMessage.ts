import { ApiError } from "@/lib/apiClient";

// ApiError hanya membawa `code`, jadi pesan untuk pengguna dipetakan di sini
// supaya layar tidak menampilkan kode mentah seperti UNKNOWN_ERROR.
const MESSAGES: Record<string, string> = {
  CANNOT_DEACTIVATE_SELF: "Anda tidak dapat menonaktifkan akun Anda sendiri.",
  CANNOT_CHANGE_OWN_ROLE: "Anda tidak dapat mengubah peran akun Anda sendiri.",
  not_found: "Pengguna tidak ditemukan. Muat ulang daftar lalu coba lagi.",
  validation_error: "Data yang dikirim tidak valid.",
};

export function adminErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return MESSAGES[err.code] ?? fallback;
  return "Terjadi kesalahan jaringan.";
}
