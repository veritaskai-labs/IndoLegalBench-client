import type { ImportRow, ImportRowStatus, ImportSummary } from "@/types/caseImport";

/**
 * Aturan tampilan ringkasan impor CSV (PBI-4 AC7): filter baris, urutan, label, dan kapan tautan suite tampil.
 * Fungsi murni, supaya komponen tabel hanya merender.
 */
export type ImportFilter = "all" | ImportRowStatus;

export const FILTERS: readonly { value: ImportFilter; label: string }[] = [];

export const STATUS_LABEL: Readonly<Record<ImportRowStatus, string>> = { created: "", failed: "", skipped: "" };

export function defaultFilter(_summary: ImportSummary): ImportFilter {
  return "all";
}

export function rowsForFilter(_rows: readonly ImportRow[], _filter: ImportFilter): ImportRow[] {
  return [];
}

export function filterCount(_rows: readonly ImportRow[], _filter: ImportFilter): number {
  return -1;
}

export function hasCreatedCases(_summary: ImportSummary): boolean {
  return false;
}

export function emptyFilterMessage(_filter: ImportFilter): string {
  return "";
}
