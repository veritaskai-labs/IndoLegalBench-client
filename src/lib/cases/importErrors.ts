import { ApiError } from "@/lib/apiClient";

/**
 * Pesan untuk kegagalan impor CSV (PBI-4 SCRUM-340): berkas ditolak utuh (422 IMPORT_*), ringkasan
 * tidak ditemukan, izin, atau koneksi.
 */
export function importErrorMessage(_error: unknown): string {
  return "";
}
