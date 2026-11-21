"use client";

import Link from "next/link";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useResultCases } from "@/hooks/useReportDrilldown";
import { formatScore } from "@/lib/grading/scoreFormat";
import { httpDrilldownGateway, type DrilldownGateway } from "@/lib/reports/drilldownApi";
import { canRetryDrilldown, CONTENT_REQUEST_TEXT, resultCaseHref } from "@/lib/reports/drilldownRules";
import { measurementKindLabel, REPORT_LABELS } from "@/lib/reports/reportLabels";
import type { ReportCaseScoreRead, ReportResultCasesRead } from "@/types/reports";

const CELL = "px-3 py-2 align-top";
const NUMBER = `${CELL} text-right tabular-nums`;
// Bagian aplikasi berbahasa Indonesia (Fase 0 K3); hanya isi laporan yang mengikuti bahasa laporan.
const LABELS = REPORT_LABELS.id;
const SPLIT_TAG: Readonly<Record<ReportCaseScoreRead["split_tag"], string>> = { test: "Test", dev: "Dev" };

/** Kode kasus menjadi tautan hanya bila server menyatakan isinya boleh dibuka peran ini (AC3, content_visible). */
function CaseCode({ reportId, resultId, item }: Readonly<{ reportId: string; resultId: string; item: ReportCaseScoreRead }>) {
  if (!item.content_visible) return <span className="font-medium text-slate-800">{item.case_code}</span>;
  return (
    <Link href={resultCaseHref(reportId, resultId, item.case_id)} className="font-medium text-indigo-700 hover:underline">
      {item.case_code}
    </Link>
  );
}

function CaseTable({ reportId, data }: Readonly<{ reportId: string; data: ReportResultCasesRead }>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-sm text-slate-800">
        <caption className="sr-only">Kasus di balik angka {data.product_label}</caption>
        <thead className="bg-slate-50 text-left text-xs text-slate-600">
          <tr>
            <th scope="col" className={CELL}>Kode kasus</th>
            <th scope="col" className={CELL}>Versi</th>
            <th scope="col" className={CELL}>Jenis kasus</th>
            <th scope="col" className={`${CELL} text-right`}>{LABELS.deterministic}</th>
            <th scope="col" className={`${CELL} text-right`}>{LABELS.llm}</th>
            <th scope="col" className={CELL}>Isi kasus</th>
          </tr>
        </thead>
        <tbody>
          {data.cases.map((item) => (
            <tr key={item.case_id} className="border-t border-slate-100">
              <th scope="row" className={`${CELL} text-left`}>
                <CaseCode reportId={reportId} resultId={data.result_id} item={item} />
              </th>
              <td className={CELL}>v{item.case_version_no}</td>
              <td className={CELL}>{SPLIT_TAG[item.split_tag]}</td>
              <td className={NUMBER}>{formatScore(item.det_score)}</td>
              <td className={NUMBER}>{formatScore(item.llm_score)}</td>
              <td className={`${CELL} text-xs text-slate-600`}>{item.content_visible ? "Dapat dibuka" : "Tertutup"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CaseListBody({ reportId, data }: Readonly<{ reportId: string; data: ReportResultCasesRead }>) {
  const someHidden = data.cases.some((item) => !item.content_visible);
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Kasus di balik angka {data.product_label}</h1>
        <p className="text-sm text-slate-600">
          {LABELS.splits[data.score_split]} · {measurementKindLabel(data.measurement_kind, "id")} · {LABELS.rubric}{" "}
          {data.rubric_version} · {data.cases.length} kasus
        </p>
      </div>
      {data.cases.length === 0 ? (
        <EmptyState title="Tidak ada kasus di balik angka ini" description="Angka ini tidak dibentuk oleh kasus dasar mana pun." />
      ) : (
        <CaseTable reportId={reportId} data={data} />
      )}
      {someHidden && (
        <p role="note" className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {CONTENT_REQUEST_TEXT}
        </p>
      )}
    </div>
  );
}

/**
 * Daftar kasus dan versi kasus di balik satu angka laporan, beserta skornya (PBI-16 AC1, D6 langkah 1–3). Semua
 * peran yang boleh membaca laporan melihat daftar ini; isi kasus hanya terbuka sesuai content_visible (AC3).
 */
export function ResultCaseList({
  reportId,
  resultId,
  gateway = httpDrilldownGateway,
}: Readonly<{ reportId: string; resultId: string; gateway?: DrilldownGateway }>) {
  const cases = useResultCases(reportId, resultId, gateway);

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Laporan", href: "/reports" },
          { label: "Laporan perbandingan", href: "/reports/comparisons" },
          { label: "Detail laporan", href: `/reports/comparisons/${encodeURIComponent(reportId)}` },
          { label: "Kasus di balik angka" },
        ]}
      />
      {cases.status === "loading" && <LoadingState label="Memuat kasus…" />}
      {cases.status === "error" && (
        <ErrorState
          variant="card"
          message={cases.message}
          onRetry={canRetryDrilldown(cases.message) ? cases.reload : undefined}
        />
      )}
      {cases.status === "ready" && <CaseListBody reportId={reportId} data={cases.data} />}
    </div>
  );
}
