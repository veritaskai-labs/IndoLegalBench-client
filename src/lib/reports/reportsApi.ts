import { apiFetch, apiFetchBlob } from "@/lib/apiClient";
import type { ReportDetail, ReportSummary, ReportSummaryPage } from "@/types/reports";

/** silentForbidden: laporan milik orang lain hanya untuk Admin (D9), dan halaman menjelaskannya sendiri tanpa /forbidden. */
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
  // shortcut: only the first page of 100 (server maximum), add a pager with the PBI-25 table work if anyone has more.
  list: () =>
    apiFetch<ReportSummaryPage>("/reports?size=100", { silentForbidden: true }).then((page) => page.items),
  detail: (reportId) => apiFetch<ReportDetail>(reportPath(reportId), { silentForbidden: true }),
  pdf: (reportId) => apiFetchBlob(`${reportPath(reportId)}/pdf`, { silentForbidden: true }),
};
