import { ApiError } from "@/lib/apiClient";

/** Pesan untuk pengguna saat membuat snapshot gagal. Kode server dicek dulu, baru status HTTP. */
export function mapCreateSnapshotError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NOTHING_TO_SNAPSHOT") {
      return "Suite ini belum punya kasus yang disetujui, jadi belum ada yang bisa dibekukan.";
    }
    if (error.status === 403) return "Hanya Admin yang boleh membuat snapshot.";
    if (error.status === 404) return "Suite tidak ditemukan.";
  }
  return "Gagal membuat snapshot. Coba lagi.";
}

export function mapSnapshotLoadError(error: unknown, target: "list" | "detail"): string {
  void error;
  void target;
  return "";
}
