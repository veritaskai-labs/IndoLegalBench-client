import { ApiError } from "@/lib/apiClient";
import { productLabelsText } from "@/lib/reports/publicationRules";
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

export const HIDDEN_REPORT = "Laporan tidak ditemukan atau Anda tidak punya akses untuk membukanya.";

/** Satu pesan untuk semua status ini supaya halaman tidak membocorkan laporan milik orang lain (D9); 422 = id salah ketik. */
const HIDDEN_STATUSES = new Set([403, 404, 422]);

function isHiddenReport(error: unknown): boolean {
  return error instanceof ApiError && HIDDEN_STATUSES.has(error.status);
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

/** Sampai jumlah ini semua produk ditulis; lebih dari itu dipotong, karena "A, B +1" tidak menghemat apa pun. */
const PRODUCTS_IN_FULL = 3;
const PRODUCTS_WHEN_CUT = 2;

export type ProductColumn = { shown: string; hiddenCount: number; full: string };

/**
 * Kolom Produk di daftar laporan (SCRUM-364, PBI-15 AC9): daftar panjang dipotong jadi "A, B" plus jumlah sisanya,
 * dan daftar lengkapnya untuk tooltip. Label sudah dibekukan server (nama asli atau kode), jadi urutan dan
 * namanya tidak diubah di layar.
 */
export function productColumn(labels: readonly string[]): ProductColumn {
  const full = productLabelsText(labels);
  if (labels.length <= PRODUCTS_IN_FULL) return { shown: full, hiddenCount: 0, full };
  return {
    shown: labels.slice(0, PRODUCTS_WHEN_CUT).join(", "),
    hiddenCount: labels.length - PRODUCTS_WHEN_CUT,
    full,
  };
}
