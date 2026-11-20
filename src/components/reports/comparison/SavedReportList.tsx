"use client";

import Link from "next/link";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useReports } from "@/hooks/useReports";
import { formatWibDate } from "@/lib/datetime/formatWib";
import { REPORT_STATUS_LABEL, SCORE_SCOPE_LABEL } from "@/lib/reports/reportRules";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import type { ReportStatus, ReportSummary } from "@/types/reports";

const STATUS_CHIP: Readonly<Record<ReportStatus, string>> = {
  saved: "bg-slate-100 text-slate-700",
  published: "bg-green-100 text-green-800",
  superseded: "bg-amber-100 text-amber-900",
};

const CELL = "px-3 py-2 align-top";

function newestFirst(reports: readonly ReportSummary[]): ReportSummary[] {
  return [...reports].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function ReportTable({ reports }: Readonly<{ reports: readonly ReportSummary[] }>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-sm text-slate-800">
        <thead className="bg-slate-50 text-left text-xs text-slate-600">
          <tr>
            <th scope="col" className={CELL}>Judul</th>
            <th scope="col" className={CELL}>Nilai</th>
            <th scope="col" className={CELL}>Status</th>
            <th scope="col" className={CELL}>Bahasa</th>
            <th scope="col" className={CELL}>Dibuat</th>
          </tr>
        </thead>
        <tbody>
          {newestFirst(reports).map((report) => (
            <tr key={report.id} className="border-t border-slate-100">
              <th scope="row" className={`${CELL} text-left font-medium`}>
                <Link
                  href={`/reports/comparisons/${encodeURIComponent(report.id)}`}
                  className="text-indigo-700 hover:underline"
                >
                  {report.title}
                </Link>
              </th>
              <td className={CELL}>{SCORE_SCOPE_LABEL[report.score_scope]}</td>
              <td className={CELL}>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[report.status]}`}>
                  {REPORT_STATUS_LABEL[report.status]}
                </span>
              </td>
              <td className={CELL}>{report.language.toUpperCase()}</td>
              <td className={`${CELL} whitespace-nowrap`}>{formatWibDate(report.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Daftar laporan (D3 langkah 10), disaring server sesuai peran (D9). Tombol Terbitkan termasuk PBI-17. */
export function SavedReportList({ gateway = httpReportsGateway }: Readonly<{ gateway?: ReportsGateway }>) {
  const reports = useReports(gateway);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Laporan", href: "/reports" }, { label: "Laporan perbandingan" }]} />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Laporan perbandingan</h1>
        <p className="text-sm text-slate-600">Setiap laporan tersimpan otomatis saat dibuat dan bisa dibuka ulang di sini.</p>
      </div>
      {reports.status === "loading" && <LoadingState label="Memuat daftar laporan…" />}
      {reports.status === "error" && <ErrorState variant="card" message={reports.message} onRetry={reports.reload} />}
      {reports.status === "ready" &&
        (reports.data.length === 0 ? (
          <EmptyState title="Belum ada laporan tersimpan" description="Laporan yang Anda buat akan muncul di sini." />
        ) : (
          <ReportTable reports={reports.data} />
        ))}
    </div>
  );
}
