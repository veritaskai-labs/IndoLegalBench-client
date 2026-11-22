import { apiFetch, apiFetchBlob } from "@/lib/apiClient";
import { readAllPages } from "@/lib/pagedList";
import type {
  EligibleSession,
  MeasurementFilter,
  ReportCreate,
  ReportCreateResponse,
  ReportDetail,
  ReportSummary,
} from "@/types/reports";

/** silentForbidden: laporan tersimpan milik orang lain hanya untuk Admin (D9); halaman menjelaskannya sendiri tanpa /forbidden. */
export interface ReportsGateway {
  /** Disaring server (D9): laporan sendiri ditambah laporan terbit dan digantikan milik orang lain; Admin melihat semua. */
  list(): Promise<ReportSummary[]>;
  /** Satu laporan dari hasil beku, tanpa hitung ulang (D3 langkah 11). */
  detail(reportId: string): Promise<ReportDetail>;
  /** PDF yang dibuat server dari hasil tersimpan, dalam bahasa laporan (D3 langkah 13–15). */
  pdf(reportId: string): Promise<Blob>;
  /** Semua sesi yang bisa dipilih di report builder, layak atau tidak beserta alasannya (SCRUM-321, PBI-15 AC4). */
  eligibleSessions(filter: MeasurementFilter): Promise<EligibleSession[]>;
  /** Buat laporan (PBI-15 AC1). 200 tanpa laporan berarti NO_SHARED_CASES, tidak ada yang disimpan. */
  create(body: ReportCreate): Promise<ReportCreateResponse>;
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
  eligibleSessions: (filter) =>
    apiFetch<EligibleSession[]>(
      `/reports/eligible-sessions?measurement_filter=${encodeURIComponent(filter)}`,
    ),
  // silentForbidden: a refused score type or label (AC9, AC14) is explained on the builder page itself.
  create: (body) =>
    apiFetch<ReportCreateResponse>("/reports", {
      method: "POST",
      body: JSON.stringify(body),
      silentForbidden: true,
    }),
};
