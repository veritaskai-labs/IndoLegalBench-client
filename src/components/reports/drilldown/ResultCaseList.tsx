"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { type Column, DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useDrilldownReport, useResultCases } from "@/hooks/useReportDrilldown";
import { formatScore } from "@/lib/grading/scoreFormat";
import { httpDrilldownGateway, type DrilldownGateway } from "@/lib/reports/drilldownApi";
import {
  canRetryDrilldown,
  CONTENT_REQUEST_TEXT,
  type ProductNumber,
  reportTrail,
  resultCaseHref,
  resultCasesHref,
  sameSplitProducts,
} from "@/lib/reports/drilldownRules";
import { measurementKindLabel, REPORT_LABELS } from "@/lib/reports/reportLabels";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import type { SortState } from "@/lib/ui/tableModel";
import type { ReportCaseScoreRead, ReportResultCasesRead } from "@/types/reports";

// Bagian aplikasi berbahasa Indonesia (Fase 0 K3); hanya isi laporan yang mengikuti bahasa laporan.
const LABELS = REPORT_LABELS.id;
const SPLIT_TAG: Readonly<Record<ReportCaseScoreRead["split_tag"], string>> = { test: "Test", dev: "Dev" };
const PAGE_SIZE = 10;

/**
 * Kolom daftar kasus (SCRUM-346 A2): pengurutan dan paginasi bersama DataTable (AC4). Kode kasus menjadi tautan
 * hanya bila server menyatakan isinya boleh dibuka peran ini (AC3, content_visible); kolom terakhir adalah aksi
 * "Buka jawaban" untuk kasus yang sama, atau "Tertutup" (temuan N6). Tautannya membawa urutan daftar, supaya
 * "Kasus berikutnya" di detail kasus mengikuti urutan yang sama (SCRUM-378).
 */
function caseColumns(reportId: string, resultId: string, sort: SortState | null): Column<ReportCaseScoreRead>[] {
  const href = (item: ReportCaseScoreRead) => resultCaseHref(reportId, resultId, item.case_id, sort);
  return [
    {
      key: "case_code",
      header: "Kode kasus",
      sortable: true,
      cell: (item) =>
        item.content_visible ? (
          <Link href={href(item)} className="font-medium text-accent-ink hover:underline">
            {item.case_code}
          </Link>
        ) : (
          <span className="font-medium text-ink">{item.case_code}</span>
        ),
    },
    { key: "case_version_no", header: "Versi", cell: (item) => `v${item.case_version_no}` },
    { key: "split_tag", header: "Jenis kasus", cell: (item) => SPLIT_TAG[item.split_tag] },
    { key: "det_score", header: LABELS.deterministic, sortable: true, cell: (item) => formatScore(item.det_score) },
    { key: "llm_score", header: LABELS.llm, sortable: true, cell: (item) => formatScore(item.llm_score) },
    {
      key: "open",
      header: "Isi kasus",
      cell: (item) =>
        item.content_visible ? (
          <Link
            href={href(item)}
            className="relative inline-flex h-8 items-center whitespace-nowrap rounded-control border border-line px-3 text-xs font-medium text-ink hover:bg-surface-hover"
          >
            Buka jawaban <span className="sr-only">{item.case_code}</span>
            <span aria-hidden="true"> ›</span>
          </Link>
        ) : (
          <span className="text-xs text-muted">Tertutup</span>
        ),
    },
  ];
}

/** Urutan daftar dan perubahannya; disimpan halaman di alamat (?urut=), lihat parseCaseSort (SCRUM-378). */
type SortProps = Readonly<{ sort: SortState | null; onSortChange?: (sort: SortState) => void }>;

function CaseTable({ reportId, data, sort, onSortChange }: Readonly<{ reportId: string; data: ReportResultCasesRead }> & SortProps) {
  // Kunci dan arahnya, bukan objek sort, supaya objek baru dari alamat yang sama tidak membangun ulang kolom.
  const sortKey = sort?.key;
  const direction = sort?.direction;
  const columns = useMemo(
    () => caseColumns(reportId, data.result_id, sortKey && direction ? { key: sortKey, direction } : null),
    [reportId, data.result_id, sortKey, direction],
  );
  return (
    <DataTable
      columns={columns}
      rows={data.cases}
      rowKey={(item) => item.case_id}
      pageSize={PAGE_SIZE}
      caption={`Kasus di balik angka ${data.product_label}`}
      initialSort={sort}
      onSortChange={onSortChange}
    />
  );
}

/**
 * Pindah ke angka yang sama milik produk lain di laporan ini tanpa kembali ke laporan (SCRUM-346 A2). Hanya tampil
 * bila laporan sudah dimuat dan punya lebih dari satu produk untuk jenis nilai ini.
 */
function ProductSwitch({
  reportId,
  resultId,
  products,
  sort,
}: Readonly<{ reportId: string; resultId: string; products: readonly ProductNumber[]; sort: SortState | null }>) {
  if (products.length < 2) return null;
  return (
    <nav aria-label="Produk di laporan ini">
      <ul className="flex list-none flex-wrap gap-2 p-0">
        {products.map((product) => {
          const current = product.resultId === resultId;
          return (
            <li key={product.resultId}>
              <Link
                href={resultCasesHref(reportId, product.resultId, sort)}
                aria-current={current ? "page" : undefined}
                className="inline-flex h-8 items-center rounded-full border border-line px-3 text-xs font-medium text-ink hover:bg-surface-hover aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
              >
                {product.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CaseListBody({
  reportId,
  data,
  products,
  sort,
  onSortChange,
}: Readonly<{ reportId: string; data: ReportResultCasesRead; products: readonly ProductNumber[] }> & SortProps) {
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
      <ProductSwitch reportId={reportId} resultId={data.result_id} products={products} sort={sort} />
      {data.cases.length === 0 ? (
        <EmptyState title="Tidak ada kasus di balik angka ini" description="Angka ini tidak dibentuk oleh kasus dasar mana pun." />
      ) : (
        <CaseTable reportId={reportId} data={data} sort={sort} onSortChange={onSortChange} />
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
 * Laporannya ikut dimuat sebagai konteks (SCRUM-346 A2): judul di breadcrumb dan pindah produk. Bila laporan gagal
 * dimuat, daftar tetap tampil dengan breadcrumb biasa. Urutan yang dipilih datang dari alamat dan dilaporkan
 * kembali ke halaman, supaya kembali dari detail kasus membuka urutan yang sama (SCRUM-378).
 */
export function ResultCaseList({
  reportId,
  resultId,
  sort = null,
  onSortChange,
  gateway = httpDrilldownGateway,
  reportsGateway = httpReportsGateway,
}: Readonly<{
  reportId: string;
  resultId: string;
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  gateway?: DrilldownGateway;
  reportsGateway?: ReportsGateway;
}>) {
  const cases = useResultCases(reportId, resultId, gateway);
  const report = useDrilldownReport(reportId, reportsGateway);
  const products =
    report.status === "ready" && cases.status === "ready" ? sameSplitProducts(report.data, cases.data.score_split) : [];

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          ...reportTrail(reportId, report.status === "ready" ? report.data.title : null),
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
      {cases.status === "ready" && (
        <CaseListBody reportId={reportId} data={cases.data} products={products} sort={sort} onSortChange={onSortChange} />
      )}
    </div>
  );
}
