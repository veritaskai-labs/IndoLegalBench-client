"use client";

import { MarkdownAnswer } from "@/components/runs/MarkdownAnswer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useResultCase } from "@/hooks/useReportDrilldown";
import { formatWibDate } from "@/lib/datetime/formatWib";
import { ATTEMPT_SOURCE_LABEL, reasonLabel } from "@/lib/grading/gradingView";
import { formatScore } from "@/lib/grading/scoreFormat";
import { httpDrilldownGateway, type DrilldownGateway } from "@/lib/reports/drilldownApi";
import { canOpenEvidence, canRetryDrilldown, NOT_GRADED, resultCasesHref } from "@/lib/reports/drilldownRules";
import { measurementKindLabel, REPORT_LABELS } from "@/lib/reports/reportLabels";
import type { ReportAttemptRead, ReportCaseDetailRead } from "@/types/reports";

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
function AttemptCard({ attempt, evidence }: Readonly<{ attempt: ReportAttemptRead; evidence: EvidenceTarget }>) {
  const headingId = `attempt-${attempt.attempt_id}`;
  return (
    <article aria-labelledby={headingId} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="text-sm font-semibold text-slate-900">
          Percobaan {attempt.repetition_no}
        </h3>
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

function CaseBody({ data, evidence }: Readonly<{ data: ReportCaseDetailRead; evidence: EvidenceTarget }>) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
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
      <section aria-labelledby="case-attempts" className="space-y-3">
        <h2 id="case-attempts" className="text-base font-semibold text-slate-900">
          Percobaan ({data.attempts.length})
        </h2>
        {data.attempts.map((attempt) => (
          <AttemptCard key={attempt.attempt_id} attempt={attempt} evidence={evidence} />
        ))}
      </section>
    </div>
  );
}

/**
 * Satu kasus di balik angka laporan, sampai jawaban asli tiap percobaan (PBI-16 AC2, D6 langkah 4–7). Peran yang
 * tidak boleh melihat isinya mendapat pesan server dengan email untuk meminta isi kasus (AC3), tanpa Coba lagi.
 * Bukti jawaban manual hanya untuk Admin dan Kontributor (AC4).
 */
export function ResultCaseDetail({
  reportId,
  resultId,
  caseId,
  gateway = httpDrilldownGateway,
}: Readonly<{ reportId: string; resultId: string; caseId: string; gateway?: DrilldownGateway }>) {
  const detail = useResultCase(reportId, resultId, caseId, gateway);
  const auth = useAuth();
  const role = auth.status === "authenticated" ? auth.user.role : null;
  const evidence = canOpenEvidence(role) ? { reportId, resultId, caseId, gateway } : null;

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Laporan", href: "/reports" },
          { label: "Laporan perbandingan", href: "/reports/comparisons" },
          { label: "Detail laporan", href: `/reports/comparisons/${encodeURIComponent(reportId)}` },
          { label: "Kasus di balik angka", href: resultCasesHref(reportId, resultId) },
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
      {detail.status === "ready" && <CaseBody data={detail.data} evidence={evidence} />}
    </div>
  );
}
