"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { reportErrorMessage, reportListErrorMessage } from "@/lib/reports/reportRules";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import type { ReportDetail, ReportSummary } from "@/types/reports";

/**
 * Satu laporan perbandingan dari hasil beku (D3 langkah 10–11). Gateway masuk sebagai parameter, jadi test dan
 * komponen tidak terikat ke fetch.
 */
export function useReport(reportId: string, gateway: ReportsGateway = httpReportsGateway) {
  return useAsyncResource<ReportDetail>(`report|${reportId}`, () => gateway.detail(reportId), reportErrorMessage);
}

/** Daftar laporan, disaring server sesuai peran (D9). */
export function useReports(gateway: ReportsGateway = httpReportsGateway) {
  return useAsyncResource<ReportSummary[]>("reports", () => gateway.list(), reportListErrorMessage);
}
