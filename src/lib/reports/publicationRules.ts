import { ApiError } from "@/lib/apiClient";
import { formatWibDate } from "@/lib/datetime/formatWib";
import type { Role } from "@/lib/auth";
import type { PublishedReportListItem, ReportSummary } from "@/types/reports";

/**
 * Aturan penerbitan laporan di layar (PBI-17 SCRUM-335, AC9, AC10, AC12). Server (SCRUM-332) tetap menjadi
 * penentu: layar hanya menyembunyikan tombol yang pasti ditolak dan menerjemahkan penolakan server.
 */

export const REPORT_HAS_DEV_SCORES = "REPORT_HAS_DEV_SCORES";
export const REPORT_NOT_PUBLISHABLE = "REPORT_NOT_PUBLISHABLE";
export const PUBLICATION_NOT_FOUND = "PUBLICATION_NOT_FOUND";
export const REPORT_NOT_FOUND = "REPORT_NOT_FOUND";

/** Sama maknanya dengan pesan server (ensure_publishable), dipakai sebelum dan sesudah tombol ditekan. */
export const DEV_SCORES_MESSAGE =
  "Laporan ini memuat skor dev, jadi tidak bisa diterbitkan. Buat laporan dengan nilai Test untuk diterbitkan.";

/** AC9: penerbitan manual oleh Admin saja. */
export function canPublish(role: Role): boolean {
  return role === "admin";
}

export type PublishState = "ready" | "dev_scores" | "already_published" | "superseded";

/** Tertutup bawaan seperti server: penanda dev ATAU jenis nilai selain Test sudah cukup untuk menolak (AC12). */
export function publishState(report: Pick<ReportSummary, "status" | "has_dev_scores" | "score_scope">): PublishState {
  if (report.status === "published") return "already_published";
  if (report.status === "superseded") return "superseded";
  if (report.has_dev_scores || report.score_scope !== "test") return "dev_scores";
  return "ready";
}

export function publishErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === REPORT_HAS_DEV_SCORES) return DEV_SCORES_MESSAGE;
    if (error.code === REPORT_NOT_PUBLISHABLE) {
      return "Laporan ini sudah terbit atau versi yang dipilih sudah diganti. Tutup dialog lalu muat ulang halaman.";
    }
    if (error.code === PUBLICATION_NOT_FOUND) return "Versi terbit yang dipilih sudah tidak ada. Tutup dialog lalu pilih lagi.";
    if (error.status === 404) return "Laporan tidak ditemukan.";
    if (error.status === 403) return "Hanya Admin yang bisa menerbitkan laporan.";
  }
  return "Laporan gagal diterbitkan. Coba lagi.";
}

/** Semua peran yang login boleh membaca daftarnya (AC9), jadi gagal di sini selalu layak dicoba lagi. */
export function publishedListErrorMessage(): string {
  return "Gagal memuat daftar laporan terbit. Coba lagi.";
}

export function versionLabel(versionNo: number): string {
  return `Versi ${versionNo}`;
}

export function replaceOptionLabel(item: Pick<PublishedReportListItem, "title" | "version_no">): string {
  return `${item.title} (${versionLabel(item.version_no)})`;
}

/** Pilihan laporan pengganti: judul bisa sama, jadi tanggal dibuat dan bahasa ikut ditulis. */
export function candidateLabel(report: Pick<ReportSummary, "title" | "created_at" | "language">): string {
  return `${report.title} · ${formatWibDate(report.created_at)} · ${report.language.toUpperCase()}`;
}

/** AC10: nama sudah dibekukan server menurut aturan PBI-15 (nama asli atau kode); layar tidak mengubahnya. */
export function productLabelsText(labels: readonly string[]): string {
  return labels.length > 0 ? labels.join(", ") : "Tidak ada produk";
}
