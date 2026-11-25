"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { MarkdownAnswer } from "@/components/runs/MarkdownAnswer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useResultCase } from "@/hooks/useReportDrilldown";
import { useReport } from "@/hooks/useReports";
import { formatWibDate } from "@/lib/datetime/formatWib";
import { ATTEMPT_SOURCE_LABEL, reasonLabel } from "@/lib/grading/gradingView";
import { formatScore } from "@/lib/grading/scoreFormat";
import { httpDrilldownGateway, type DrilldownGateway } from "@/lib/reports/drilldownApi";
import {
  canCompareProducts,
  canOpenEvidence,
  canRetryDrilldown,
  NOT_GRADED,
  resultCasesHref,
} from "@/lib/reports/drilldownRules";
import { measurementKindLabel, REPORT_LABELS } from "@/lib/reports/reportLabels";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import type { MeasurementKind, ReportAttemptRead, ReportCaseDetailRead, ReportOtherProductRead } from "@/types/reports";

import { AttemptEvidence } from "./AttemptEvidence";

// Bagian aplikasi berbahasa Indonesia (Fase 0 K3); jawaban asli tampil apa adanya.
const LABELS = REPORT_LABELS.id;
const BADGE = "rounded-full px-2 py-0.5 text-xs font-semibold";

function Scores({ det, llm }: Readonly<{ det: string | null; llm: string | null }>) {
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <div className="flex gap-1">
        <dt className="text-slate-600">{LABELS.deterministic}:</dt>
        <dd className="font-semibold tabular-nums text-slate-900">{formatScore(det)}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-slate-600">{LABELS.llm}:</dt>
        <dd className="font-semibold tabular-nums text-slate-900">{formatScore(llm)}</dd>
      </div>
    </dl>
  );
}

/** Pengisi dan tanggal jawaban manual (AC2). Nilai kosong, misalnya akun pengisi yang sudah dihapus, jadi tanda pisah. */
function ManualFacts({ attempt }: Readonly<{ attempt: ReportAttemptRead }>) {
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      <div className="flex gap-1">
        <dt>Diisi oleh:</dt>
        <dd className="font-medium text-slate-800">{attempt.filled_by_name ?? "–"}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Tanggal jawaban:</dt>
        <dd className="font-medium text-slate-800">{attempt.answered_at ? formatWibDate(attempt.answered_at) : "–"}</dd>
      </div>
    </dl>
  );
}

/** Penunjuk bukti untuk percobaan manual; null bila peran ini tidak boleh membuka bukti (AC4). */
type EvidenceTarget = Readonly<{ reportId: string; resultId: string; caseId: string; gateway: DrilldownGateway }> | null;

/**
 * Satu percobaan: label asal, skor atau "Tidak dinilai", jawaban asli (markdown), penjelasan penilai, dan kode
 * alasan (AC2). Percobaan gagal teknis tidak punya skor, jadi tidak pernah tampil sebagai 0.
 */
function AttemptCard({
  attempt,
  evidence,
  nested = false,
}: Readonly<{ attempt: ReportAttemptRead; evidence: EvidenceTarget; nested?: boolean }>) {
  const headingId = `attempt-${attempt.attempt_id}`;
  const Heading = nested ? "h4" : "h3";
  return (
    <article aria-labelledby={headingId} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Heading id={headingId} className="text-sm font-semibold text-slate-900">
          Percobaan {attempt.repetition_no}
        </Heading>
        <span className={`${BADGE} bg-slate-100 text-slate-700`}>{ATTEMPT_SOURCE_LABEL[attempt.source]}</span>
        {!attempt.graded && <span className={`${BADGE} bg-amber-100 text-amber-900`}>{NOT_GRADED}</span>}
      </div>
      {attempt.source === "manual" && <ManualFacts attempt={attempt} />}
      {attempt.graded && <Scores det={attempt.det_score} llm={attempt.llm_score} />}
      <section aria-label={`Jawaban asli percobaan ${attempt.repetition_no}`} className="rounded-md border border-slate-100 bg-slate-50">
        {attempt.answer_text ? (
          <MarkdownAnswer source={attempt.answer_text} />
        ) : (
          <p className="px-3 py-2 text-sm text-slate-500">Tidak ada jawaban.</p>
        )}
      </section>
      {attempt.explanation && (
        <p className="text-sm text-slate-700">
          <span className="font-medium">Penjelasan penilai:</span> {attempt.explanation}
        </p>
      )}
      {attempt.reasons.length > 0 && (
        <p className="text-sm text-slate-700">
          <span className="font-medium">Alasan:</span> {attempt.reasons.map(reasonLabel).join(", ")}
        </p>
      )}
      {evidence && attempt.source === "manual" && <AttemptEvidence {...evidence} attemptNo={attempt.repetition_no} />}
    </article>
  );
}

function Attempts({ data, evidence }: Readonly<{ data: ReportCaseDetailRead; evidence: EvidenceTarget }>) {
  return (
    <section aria-labelledby="case-attempts" className="space-y-3">
      <h2 id="case-attempts" className="text-base font-semibold text-slate-900">
        Percobaan ({data.attempts.length})
      </h2>
      {data.attempts.map((attempt) => (
        <AttemptCard key={attempt.attempt_id} attempt={attempt} evidence={evidence} />
      ))}
    </section>
  );
}

const STATUS_LABEL: Record<Exclude<ReportOtherProductRead["status"], "answered">, string> = {
  no_answer: "Tidak menjawab",
  not_graded: NOT_GRADED,
};

type ProductSide = Readonly<{
  label: string;
  kind: MeasurementKind;
  isTrial: boolean;
  status: ReportOtherProductRead["status"];
  rubricVersion: string | null;
  det: string | null;
  llm: string | null;
  attempts: ReportAttemptRead[];
  evidence: EvidenceTarget;
}>;

function ProductColumn({ side }: Readonly<{ side: ProductSide }>) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={headingId} className="text-base font-semibold text-slate-900">
            {side.label}
          </h3>
          {side.isTrial && <span className={`${BADGE} bg-violet-100 text-violet-800`}>{LABELS.trial}</span>}
          {side.status !== "answered" && (
            <span className={`${BADGE} bg-amber-100 text-amber-900`}>{STATUS_LABEL[side.status]}</span>
          )}
        </div>
        <p className="text-sm text-slate-600">
          {measurementKindLabel(side.kind, "id")} · {LABELS.rubric} {side.rubricVersion ?? "–"}
        </p>
        {side.status === "answered" && <Scores det={side.det} llm={side.llm} />}
      </header>
      {side.attempts.length > 0 ? (
        side.attempts.map((attempt) => (
          <AttemptCard key={attempt.attempt_id} attempt={attempt} evidence={side.evidence} nested />
        ))
      ) : (
        <p className="text-sm text-slate-500">Produk ini tidak menjawab kasus ini.</p>
      )}
    </section>
  );
}

function openedSide(data: ReportCaseDetailRead, evidence: EvidenceTarget): ProductSide {
  return {
    label: data.product_label,
    kind: data.measurement_kind,
    isTrial: false,
    status: "answered",
    rubricVersion: data.rubric_version,
    det: data.det_score,
    llm: data.llm_score,
    attempts: data.attempts,
    evidence,
  };
}

function otherSide(other: ReportOtherProductRead): ProductSide {
  return {
    label: other.product_label,
    kind: other.measurement_kind,
    isTrial: other.is_trial,
    status: other.status,
    rubricVersion: other.rubric_version,
    det: other.det_score,
    llm: other.llm_score,
    attempts: other.attempts,
    evidence: null,
  };
}

/** Jawaban produk lain di laporan yang sama, berdampingan (SCRUM-372). Lebih dari satu produk lain: pilih dulu. */
function ComparableAttempts({ data, evidence }: Readonly<{ data: ReportCaseDetailRead; evidence: EvidenceTarget }>) {
  const [comparing, setComparing] = useState(false);
  const [pickedId, setPickedId] = useState("");
  const pickerId = useId();
  const others = data.other_products;
  if (others.length === 0) {
    return (
      <>
        <p className="text-sm text-slate-600">Tidak ada produk lain di laporan ini untuk dibandingkan.</p>
        <Attempts data={data} evidence={evidence} />
      </>
    );
  }
  const other = others.length === 1 ? others[0] : others.find((product) => product.result_id === pickedId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={comparing}
          onClick={() => setComparing(!comparing)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 aria-pressed:border-slate-900 aria-pressed:bg-slate-900 aria-pressed:text-white"
        >
          Bandingkan dengan produk lain
        </button>
        {comparing && others.length > 1 && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <label htmlFor={pickerId}>Produk pembanding</label>
            <select
              id={pickerId}
              value={pickedId}
              onChange={(event) => setPickedId(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
            >
              <option value="">Pilih produk</option>
              {others.map((product) => (
                <option key={product.result_id} value={product.result_id}>
                  {product.product_label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {comparing && other ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ProductColumn side={openedSide(data, evidence)} />
          <ProductColumn side={otherSide(other)} />
        </div>
      ) : (
        <Attempts data={data} evidence={evidence} />
      )}
    </div>
  );
}

function CaseBody({
  data,
  evidence,
  canCompare,
  listHref,
}: Readonly<{ data: ReportCaseDetailRead; evidence: EvidenceTarget; canCompare: boolean; listHref: string }>) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        {/* SCRUM-346 A2 (AC3): a visible way back next to the title, not only the small breadcrumb. */}
        <Link href={listHref} className="inline-flex items-center gap-1 text-sm font-medium text-accent-ink hover:underline">
          <span aria-hidden="true">‹</span> Kembali ke daftar kasus
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">
          {data.case_code} v{data.case_version_no}: {data.title}
        </h1>
        <p className="text-sm text-slate-600">
          {data.product_label} · {measurementKindLabel(data.measurement_kind, "id")} · Kasus {data.split_tag} ·{" "}
          {LABELS.rubric} {data.rubric_version}
          {data.category ? ` · ${data.category}` : ""}
        </p>
        <Scores det={data.det_score} llm={data.llm_score} />
      </header>
      <section aria-labelledby="case-question" className="space-y-2">
        <h2 id="case-question" className="text-base font-semibold text-slate-900">
          Isi kasus
        </h2>
        <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          {data.question ?? "–"}
        </p>
      </section>
      {canCompare ? <ComparableAttempts data={data} evidence={evidence} /> : <Attempts data={data} evidence={evidence} />}
    </div>
  );
}

/**
 * Satu kasus di balik angka laporan, sampai jawaban asli tiap percobaan (PBI-16 AC2, D6 langkah 4–7). Peran yang
 * tidak boleh melihat isinya mendapat pesan server dengan email untuk meminta isi kasus (AC3), tanpa Coba lagi.
 * Bukti jawaban manual hanya untuk Admin dan Kontributor (AC4). Laporannya dimuat sebagai konteks untuk judul di
 * breadcrumb (SCRUM-346 A2); bila gagal, breadcrumb memakai "Detail laporan".
 */
export function ResultCaseDetail({
  reportId,
  resultId,
  caseId,
  gateway = httpDrilldownGateway,
  reportsGateway = httpReportsGateway,
}: Readonly<{
  reportId: string;
  resultId: string;
  caseId: string;
  gateway?: DrilldownGateway;
  reportsGateway?: ReportsGateway;
}>) {
  const detail = useResultCase(reportId, resultId, caseId, gateway);
  const report = useReport(reportId, reportsGateway);
  const listHref = resultCasesHref(reportId, resultId);
  const auth = useAuth();
  const role = auth.status === "authenticated" ? auth.user.role : null;
  const evidence = canOpenEvidence(role) ? { reportId, resultId, caseId, gateway } : null;

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Laporan", href: "/reports" },
          { label: "Laporan perbandingan", href: "/reports/comparisons" },
          {
            label: report.status === "ready" ? report.data.title : "Detail laporan",
            href: `/reports/comparisons/${encodeURIComponent(reportId)}`,
          },
          { label: "Kasus di balik angka", href: listHref },
          { label: detail.status === "ready" ? detail.data.case_code : "Kasus" },
        ]}
      />
      {detail.status === "loading" && <LoadingState label="Memuat kasus…" />}
      {detail.status === "error" && (
        <ErrorState
          variant="card"
          message={detail.message}
          onRetry={canRetryDrilldown(detail.message) ? detail.reload : undefined}
        />
      )}
      {detail.status === "ready" && (
        <CaseBody data={detail.data} evidence={evidence} canCompare={canCompareProducts(role)} listHref={listHref} />
      )}
    </div>
  );
}
