import { apiFetch, apiFetchBlob } from "@/lib/apiClient";
import type { EvidenceRead } from "@/types/measurement";
import type { ReportCaseDetailRead, ReportResultCasesRead } from "@/types/reports";

/**
 * Penelusuran angka laporan (PBI-16, server#149, D6 langkah 1–8). Kuncinya id angka (result_id), bukan sesi,
 * supaya laporan mode kode tidak membuka produk di baliknya (AC9). silentForbidden: 403 isi kasus dijelaskan
 * halamannya sendiri (AC3), bukan dipindah ke /forbidden.
 */
export interface DrilldownGateway {
  /** Kasus dasar di balik satu angka: kode, versi, dan skornya, tanpa isi (AC1). */
  cases(reportId: string, resultId: string): Promise<ReportResultCasesRead>;
  /** Satu kasus sampai jawaban asli tiap percobaan (AC2); 403 CASE_CONTENT_FORBIDDEN untuk peran tanpa hak (AC3). */
  caseDetail(reportId: string, resultId: string, caseId: string): Promise<ReportCaseDetailRead>;
  /** Bukti satu jawaban manual, hanya Admin dan Kontributor (AC4). */
  evidence(reportId: string, resultId: string, caseId: string, attemptNo: number): Promise<EvidenceRead[]>;
  /** Berkas satu bukti; server memastikan bukti itu milik kasus ini (AC4). */
  evidenceFile(reportId: string, resultId: string, caseId: string, evidenceId: string): Promise<Blob>;
}

function casePath(reportId: string, resultId: string, caseId: string): string {
  return `${resultPath(reportId, resultId)}/cases/${encodeURIComponent(caseId)}`;
}

function resultPath(reportId: string, resultId: string): string {
  return `/reports/${encodeURIComponent(reportId)}/results/${encodeURIComponent(resultId)}`;
}

const SILENT = { silentForbidden: true } as const;

export const httpDrilldownGateway: DrilldownGateway = {
  cases: (reportId, resultId) => apiFetch<ReportResultCasesRead>(`${resultPath(reportId, resultId)}/cases`, SILENT),
  caseDetail: (reportId, resultId, caseId) =>
    apiFetch<ReportCaseDetailRead>(casePath(reportId, resultId, caseId), SILENT),
  evidence: (reportId, resultId, caseId, attemptNo) =>
    apiFetch<EvidenceRead[]>(`${casePath(reportId, resultId, caseId)}/attempts/${attemptNo}/evidence`, SILENT),
  evidenceFile: (reportId, resultId, caseId, evidenceId) =>
    apiFetchBlob(`${casePath(reportId, resultId, caseId)}/evidence/${encodeURIComponent(evidenceId)}/file`, SILENT),
};
