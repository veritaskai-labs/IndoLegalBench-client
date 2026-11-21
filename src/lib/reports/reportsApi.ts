import { apiFetch, apiFetchBlob } from "@/lib/apiClient";
import { readAllPages } from "@/lib/pagedList";
import type { ReportDetail, ReportSummary } from "@/types/reports";

/** silentForbidden: laporan tersimpan milik orang lain hanya untuk Admin (D9); halaman menjelaskannya sendiri tanpa /forbidden. */
export interface ReportsGateway {
  /** Disaring server (D9): laporan sendiri ditambah laporan terbit dan digantikan milik orang lain; Admin melihat semua. */
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
  // Semua halaman: Ganti versi (SCRUM-335) memilih pengganti dari daftar ini, jadi laporan setelah 100 pertama
  // tidak boleh hilang.
  list: () => readAllPages<ReportSummary>("/reports"),
  detail: (reportId) => apiFetch<ReportDetail>(reportPath(reportId), { silentForbidden: true }),
  pdf: (reportId) => apiFetchBlob(`${reportPath(reportId)}/pdf`, { silentForbidden: true }),
};
