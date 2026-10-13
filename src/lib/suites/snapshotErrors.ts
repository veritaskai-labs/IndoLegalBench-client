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

/** Pesan saat daftar snapshot atau isi satu snapshot gagal dimuat. */
export function mapSnapshotLoadError(error: unknown, target: "list" | "detail"): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Anda tidak memiliki izin untuk melihat snapshot.";
    if (error.status === 404) {
      return target === "list" ? "Suite tidak ditemukan." : "Snapshot tidak ditemukan.";
    }
  }
  return target === "list" ? "Gagal memuat daftar snapshot." : "Gagal memuat isi snapshot.";
}
