import { apiFetch, apiFetchBlob } from "@/lib/apiClient";
import type {
  EligibleSession,
  MeasurementFilter,
  ReportCreate,
  ReportCreateResponse,
  ReportDetail,
  ReportSummary,
  ReportSummaryPage,
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
  // shortcut: only the first page of 100 (server maximum), add a pager with the PBI-25 table work if anyone has more.
  list: () =>
    apiFetch<ReportSummaryPage>("/reports?size=100", { silentForbidden: true }).then((page) => page.items),
  detail: (reportId) => apiFetch<ReportDetail>(reportPath(reportId), { silentForbidden: true }),
  pdf: (reportId) => apiFetchBlob(`${reportPath(reportId)}/pdf`, { silentForbidden: true }),
  // red skeleton (SCRUM-321 cycle 9): real signatures, no request yet.
  eligibleSessions: (filter) => {
    void filter;
    return Promise.resolve([]);
  },
  create: (body) => {
    void body;
    return Promise.resolve({ report: null, warning: null });
  },
};
