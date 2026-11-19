import { apiFetch, apiFetchBlob } from "@/lib/apiClient";
import type { ReportDetail, ReportSummary } from "@/types/reports";

/**
 * Pintu ke server untuk laporan perbandingan (PBI-15, D3 langkah 10–15). Hook dan komponen bergantung pada
 * interface ini, bukan pada fetch, jadi test-nya memakai gateway palsu. Polanya sama dengan GradingGateway.
 *
 * Endpoint dibuat di SCRUM-320 (server#145, masih draft). Semua memakai silentForbidden: laporan tersimpan
 * milik orang lain hanya untuk Admin (D9), dan halaman menjelaskannya sendiri tanpa pindah ke /forbidden.
 */
export interface ReportsGateway {
  /** Laporan tersimpan yang boleh dilihat: milik sendiri, atau semua untuk Admin (D3 langkah 10). */
  list(): Promise<ReportSummary[]>;
  /** Satu laporan dari hasil beku, tanpa hitung ulang (D3 langkah 11). */
  detail(reportId: string): Promise<ReportDetail>;
  /** PDF yang dibuat server dari hasil tersimpan, dalam bahasa laporan (D3 langkah 13–15). */
  pdf(reportId: string): Promise<Blob>;
}

function reportPath(reportId: string): string {
  return `/reports/${encodeURIComponent(reportId)}`;
}

export const httpReportsGateway: ReportsGateway = {
  list: () => apiFetch<ReportSummary[]>("/reports", { silentForbidden: true }),
  detail: (reportId) => apiFetch<ReportDetail>(reportPath(reportId), { silentForbidden: true }),
  pdf: (reportId) => apiFetchBlob(`${reportPath(reportId)}/pdf`, { silentForbidden: true }),
};
