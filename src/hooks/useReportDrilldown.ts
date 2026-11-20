"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpDrilldownGateway, type DrilldownGateway } from "@/lib/reports/drilldownApi";
import { drilldownErrorMessage } from "@/lib/reports/drilldownRules";
import type { ReportCaseDetailRead, ReportResultCasesRead } from "@/types/reports";

/** Kasus dasar di balik satu angka laporan (AC1, D6 langkah 2–3). */
export function useResultCases(reportId: string, resultId: string, gateway: DrilldownGateway = httpDrilldownGateway) {
  return useAsyncResource<ReportResultCasesRead>(
    `result-cases|${reportId}|${resultId}`,
    () => gateway.cases(reportId, resultId),
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
