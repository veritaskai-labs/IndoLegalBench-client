import type { ImportRow, ImportRowStatus, ImportSummary } from "@/types/caseImport";

/**
 * Aturan tampilan ringkasan impor CSV (PBI-4 AC7): filter baris, urutan, label, dan kapan tautan suite tampil.
 * Fungsi murni, supaya komponen tabel hanya merender.
 */
export type ImportFilter = "all" | ImportRowStatus;

/** Urutan tombol filter: yang gagal langsung setelah "Semua", karena itulah yang perlu diperbaiki. */
export const FILTERS: readonly { value: ImportFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "failed", label: "Gagal" },
  { value: "skipped", label: "Dilewati" },
  { value: "created", label: "Berhasil" },
];

/** Record atas enum kontrak: status baru dari server membuat tsc gagal di sini, bukan tampil tanpa label. */
export const STATUS_LABEL: Readonly<Record<ImportRowStatus, string>> = {
  created: "Berhasil",
  failed: "Gagal",
  skipped: "Dilewati",
};

const EMPTY_MESSAGE: Readonly<Record<ImportFilter, string>> = {
  all: "Tidak ada baris di ringkasan ini.",
  failed: "Tidak ada baris yang gagal.",
  skipped: "Tidak ada baris yang dilewati.",
  created: "Tidak ada kasus yang berhasil masuk.",
};

/** Buka di baris gagal bila ada; selain itu semua baris. */
export function defaultFilter(summary: ImportSummary): ImportFilter {
  return summary.failed_count > 0 ? "failed" : "all";
}

function matches(row: ImportRow, filter: ImportFilter): boolean {
  return filter === "all" || row.status === filter;
}

/** Baris untuk satu filter, urut nomor baris spreadsheet. Array dari server tidak diubah. */
export function rowsForFilter(rows: readonly ImportRow[], filter: ImportFilter): ImportRow[] {
  return rows.filter((row) => matches(row, filter)).sort((a, b) => a.row_no - b.row_no);
}

/** Dihitung dari baris, jadi angka di tombol selalu sama dengan jumlah baris yang tampil. */
export function filterCount(rows: readonly ImportRow[], filter: ImportFilter): number {
  return rows.filter((row) => matches(row, filter)).length;
}

/** Server mengarsipkan suite sementara yang kosong, jadi tautannya hanya bila ada kasus yang masuk. */
export function hasCreatedCases(summary: ImportSummary): boolean {
  return summary.success_count > 0;
}

export function emptyFilterMessage(filter: ImportFilter): string {
  return EMPTY_MESSAGE[filter];
}
