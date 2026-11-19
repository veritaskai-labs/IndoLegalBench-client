import { ApiError } from "@/lib/apiClient";
import type { ReportStatus, ScoreScope } from "@/types/reports";

/** Label status di bagian aplikasi (Bahasa Indonesia sampai PBI-26, Fase 0 K3). */
export const REPORT_STATUS_LABEL: Readonly<Record<ReportStatus, string>> = {
  saved: "Tersimpan",
  published: "Terbit",
  superseded: "Digantikan",
};

/** Jenis nilai laporan untuk daftar laporan tersimpan (PBI-15 AC14). */
export const SCORE_SCOPE_LABEL: Readonly<Record<ScoreScope, string>> = {
  test: "Test",
  dev: "Dev",
  dev_test: "Dev + Test",
};

const HIDDEN_REPORT = "Laporan tidak ditemukan atau Anda tidak punya akses untuk membukanya.";

/**
 * Laporan tersimpan milik orang lain hanya bisa dibuka Admin (D9). Server bisa menjawab 403 atau 404, dan
 * keduanya diberi pesan yang sama supaya halaman tidak membocorkan bahwa laporan itu ada.
 */
function isHiddenReport(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404);
}

export function reportErrorMessage(error: unknown): string {
  return isHiddenReport(error) ? HIDDEN_REPORT : "Gagal memuat laporan. Coba lagi.";
}

/** Semua peran boleh membaca daftarnya (D9), jadi gagal di sini selalu layak dicoba lagi. */
export function reportListErrorMessage(): string {
  return "Gagal memuat daftar laporan. Coba lagi.";
}

export function pdfErrorMessage(error: unknown): string {
  return isHiddenReport(error) ? HIDDEN_REPORT : "PDF gagal dimuat. Coba lagi.";
}

/**
 * Pratinjau PDF di dalam halaman hanya kalau browser menyatakan bisa menampilkan PDF (Fase 0 K5). Properti
 * yang tidak ada, seperti di browser lama, dianggap tidak bisa; sebagian besar ponsel juga menjawab false.
 */
export function supportsInlinePdf(nav: { pdfViewerEnabled?: boolean } | undefined): boolean {
  return nav?.pdfViewerEnabled === true;
}

/**
 * Nama berkas unduhan sama dengan server (pdf.py report_pdf_filename): memakai id, bukan judul yang diketik
 * pengguna. Id datang dari URL, jadi karakter selain huruf, angka, garis bawah, dan tanda hubung diganti.
 */
export function reportPdfFileName(reportId: string): string {
  return `laporan-${reportId.replaceAll(/[^A-Za-z0-9_-]/g, "-")}.pdf`;
}
