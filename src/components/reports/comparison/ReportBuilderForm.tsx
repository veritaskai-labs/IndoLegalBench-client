"use client";

import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";

/** Halaman pembuat laporan perbandingan (SCRUM-321). Kerangka merah: belum menampilkan apa pun. */
export function ReportBuilderForm({ gateway = httpReportsGateway }: Readonly<{ gateway?: ReportsGateway }>) {
  void gateway;
  return <div />;
}
