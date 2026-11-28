"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpDrilldownGateway, type DrilldownGateway } from "@/lib/reports/drilldownApi";
import { drilldownErrorMessage } from "@/lib/reports/drilldownRules";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import { reportErrorMessage } from "@/lib/reports/reportRules";
import type { ReportCaseDetailRead, ReportDetail, ReportResultCasesRead } from "@/types/reports";

/**
 * Ingatan satu entri untuk data drill-down yang beku (SCRUM-378). Berpindah antara daftar kasus dan detail kasus,
 * atau dari satu kasus ke kasus berikutnya, tidak meminta ulang data yang sama. Laporan beku setelah dibuat (server
 * tidak punya rute ubah laporan; status terbit tidak dipakai di sini), jadi isinya tidak basi. Hanya hasil yang
 * berhasil yang diingat, jadi Coba lagi selalu bertanya ke server.
 */
function rememberLast<T>() {
  let last: { key: string; data: T } | null = null;
  return {
    async load(key: string, fetch: () => Promise<T>): Promise<T> {
      if (last?.key === key) return last.data;
      const data = await fetch();
      last = { key, data };
      return data;
    },
    forget() {
      last = null;
    },
  };
}

/** Daftar kasus terakhir: kode dan skor saja; isi kasus tetap dijaga server. */
const casesMemory = rememberLast<ReportResultCasesRead>();
/** Laporan terakhir, untuk judul di breadcrumb dan pindah produk (review #135: tidak diminta ulang per kasus). */
const reportMemory = rememberLast<ReportDetail>();

/** Untuk tes: lupakan semua yang diingat supaya tiap tes mulai bersih. */
export function forgetDrilldownMemory(): void {
  casesMemory.forget();
  reportMemory.forget();
}

/**
 * Kasus dasar di balik satu angka laporan (AC1, D6 langkah 2–3). Daftar yang sama dipakai halaman daftar dan
 * navigasi detail kasus, jadi berpindah di antara keduanya tidak memuat ulang daftarnya (SCRUM-378).
 */
export function useResultCases(reportId: string, resultId: string, gateway: DrilldownGateway = httpDrilldownGateway) {
  const key = `result-cases|${reportId}|${resultId}`;
  return useAsyncResource<ReportResultCasesRead>(
    key,
    () => casesMemory.load(key, () => gateway.cases(reportId, resultId)),
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

/**
 * Laporan sebagai konteks halaman drill-down: judul di breadcrumb dan pindah produk (SCRUM-346 A2). Diingat seperti
 * daftar kasus, supaya melangkah melalui 30 kasus tidak meminta laporan yang sama 30 kali (review #135). Halaman
 * laporan sendiri tetap memakai useReport tanpa ingatan, karena statusnya berubah saat diterbitkan.
 */
export function useDrilldownReport(reportId: string, gateway: ReportsGateway = httpReportsGateway) {
  const key = `drilldown-report|${reportId}`;
  return useAsyncResource<ReportDetail>(key, () => reportMemory.load(key, () => gateway.detail(reportId)), reportErrorMessage);
}
