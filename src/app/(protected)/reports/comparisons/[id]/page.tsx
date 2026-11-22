"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ReportDocument } from "@/components/reports/comparison/ReportDocument";
import { ReportPdfActions } from "@/components/reports/comparison/ReportPdfActions";
import { ReportPublishActions } from "@/components/reports/publication/ReportPublishActions";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useReport } from "@/hooks/useReports";
import { resultCasesHref } from "@/lib/reports/drilldownRules";
import { versionLabel } from "@/lib/reports/publicationRules";
import { HIDDEN_REPORT, REPORT_STATUS_LABEL } from "@/lib/reports/reportRules";
import { decodeRouteParam } from "@/lib/routeParams";
import type { PublicationRead } from "@/types/reports";

const GENERAL_TITLE = "Laporan perbandingan";

/** Item terakhir breadcrumb: judul laporan, "…" selama dimuat (null), atau judul umum bila gagal. */
function currentLabel(report: ReturnType<typeof useReport>): string | null {
  if (report.status === "ready") return report.data.title;
  return report.status === "loading" ? null : GENERAL_TITLE;
}

/**
 * Satu laporan perbandingan yang dibuka ulang dari hasil beku (PBI-15, D3 langkah 10–15). Bagian aplikasi
 * (breadcrumb, status, tombol) berbahasa Indonesia; isi laporan mengikuti bahasa laporan (Fase 0 K3). Laporan
 * tersimpan milik orang lain hanya untuk Admin (D9): server menolaknya, dan halaman tidak menawarkan PDF.
 * Penerbitan (PBI-17 SCRUM-335) ada di bawah tombol: Admin menerbitkan, semua peran melihat tanda versi lama.
 * Pesan versi baru disimpan di halaman, bukan di bagian penerbitan, karena bagian itu hilang sebentar saat laporan
 * dimuat ulang sesudah terbit.
 */
export default function ComparisonReportPage() {
  const reportId = decodeRouteParam(useParams<{ id: string }>().id);
  const report = useReport(reportId);
  const [published, setPublished] = useState<{ reportId: string; publication: PublicationRead } | null>(null);

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Laporan", href: "/reports" },
          { label: GENERAL_TITLE, href: "/reports/comparisons" },
          { label: currentLabel(report) },
        ]}
      />

      {published?.reportId === reportId && <PublishedMessage reportId={reportId} publication={published.publication} />}
      {report.status !== "ready" && <h1 className="text-xl font-semibold text-slate-900">{GENERAL_TITLE}</h1>}
      {report.status === "loading" && <LoadingState label="Memuat laporan…" />}
      {report.status === "error" && (
        <ErrorState
          variant="card"
          message={report.message}
          onRetry={report.message === HIDDEN_REPORT ? undefined : report.reload}
        />
      )}

      {report.status === "ready" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                {REPORT_STATUS_LABEL[report.data.status]}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                Bahasa laporan: {report.data.language.toUpperCase()}
              </span>
            </div>
            <ReportPdfActions reportId={report.data.id} />
          </div>
          <ReportPublishActions
            report={report.data}
            onChanged={(publication) => {
              if (publication) setPublished({ reportId, publication });
              report.reload();
            }}
          />
          <ReportDocument report={report.data} scoreHref={(resultId) => resultCasesHref(report.data.id, resultId)} />
        </>
      )}
    </div>
  );
}

/** Versi baru sesudah Terbitkan atau Ganti versi. Ganti versi menerbitkan laporan lain, jadi ada tautannya. */
function PublishedMessage({ reportId, publication }: Readonly<{ reportId: string; publication: PublicationRead }>) {
  const replaced = publication.report_id !== reportId;
  return (
    <output className="block rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
      {replaced ? "Laporan pengganti" : "Laporan"} diterbitkan sebagai {versionLabel(publication.version_no)}.
      {replaced && (
        <>
          {" "}
          <Link
            href={`/reports/comparisons/${encodeURIComponent(publication.report_id)}`}
            className="font-medium text-indigo-700 hover:underline"
          >
            Buka versi baru
          </Link>
        </>
      )}
    </output>
  );
}
