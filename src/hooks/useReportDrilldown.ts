"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpDrilldownGateway, type DrilldownGateway } from "@/lib/reports/drilldownApi";
import { drilldownErrorMessage } from "@/lib/reports/drilldownRules";
import type { ReportCaseDetailRead, ReportResultCasesRead } from "@/types/reports";

/**
 * Daftar kasus terakhir yang berhasil dimuat (SCRUM-378). Detail kasus butuh daftar yang sama untuk "Kasus
 * berikutnya"; dari halaman daftar, daftarnya dipakai ulang tanpa request ketiga. Hanya satu daftar yang diingat,
 * dan laporan beku setelah dibuat, jadi isinya tidak basi. Hanya kode dan skor: isi kasus tetap dijaga server.
 */
let lastCases: { key: string; data: ReportResultCasesRead } | null = null;

/** Untuk tes: lupakan daftar yang diingat supaya tiap tes mulai bersih. */
export function forgetResultCases(): void {
  lastCases = null;
}

async function loadResultCases(key: string, load: () => Promise<ReportResultCasesRead>): Promise<ReportResultCasesRead> {
  if (lastCases?.key === key) return lastCases.data;
  const data = await load();
  lastCases = { key, data };
  return data;
}

/**
 * Kasus dasar di balik satu angka laporan (AC1, D6 langkah 2–3). Daftar yang sama dipakai halaman daftar dan
 * navigasi detail kasus, jadi berpindah di antara keduanya tidak memuat ulang daftarnya (SCRUM-378).
 */
export function useResultCases(reportId: string, resultId: string, gateway: DrilldownGateway = httpDrilldownGateway) {
  const key = `result-cases|${reportId}|${resultId}`;
  return useAsyncResource<ReportResultCasesRead>(
    key,
    () => loadResultCases(key, () => gateway.cases(reportId, resultId)),
    drilldownErrorMessage,
  );
}

/** Satu kasus sampai jawaban asli tiap percobaan (AC2, D6 langkah 5–7). */
export function useResultCase(
  reportId: string,
  resultId: string,
  caseId: string,
  gateway: DrilldownGateway = httpDrilldownGateway,
) {
  return useAsyncResource<ReportCaseDetailRead>(
    `result-case|${reportId}|${resultId}|${caseId}`,
    () => gateway.caseDetail(reportId, resultId, caseId),
    drilldownErrorMessage,
  );
}
