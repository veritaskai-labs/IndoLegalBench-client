"use client";

import { useId, useState } from "react";
import { GradeSessionDialog } from "@/components/grading/GradeSessionDialog";
import { GradingProgressBar } from "@/components/grading/GradingProgressBar";
import { RETRY_GRADING_DIALOG } from "@/lib/grading/gradingRules";
import { FinalizeSessionDialog } from "@/components/manual-runs/FinalizeSessionDialog";
import { ScoreDownloadButton, gradingOf } from "@/components/runs/ScoreDownloadButton";
import { SessionStatusBadge } from "@/components/runs/SessionStatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useGradingProgress } from "@/hooks/useGradingProgress";
import { useSessionResults } from "@/hooks/useSessionResults";
import { formatWib } from "@/lib/datetime/formatWib";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { unknownName } from "@/lib/runs/sessionRules";
import { caseFilterLabel, measurementPurposeLabel } from "@/lib/runs/sessionDetail";
import { AUTOMATIC_SESSION_STANDARD_REPETITIONS } from "@/types/measurement";
import type { Role } from "@/types";
import type { ManualSessionDetail } from "@/types/measurement";

const COPY = messages({
  id: {
    noAnswers: "Sesi ini tidak memiliki jawaban untuk diisi.",
    remaining: "Isi {count} jawaban lagi untuk mengaktifkan tombol ini.",
    gradeNeedsAnswers: "Semua jawaban harus terisi sebelum dapat dikirim untuk dinilai.",
    gradingBackground: "Penilaian sesi ini sedang berjalan di latar belakang.",
    sendToGrade: "Kirim sesi ini untuk dinilai.",
    gradedToast: "Sesi “{label}” selesai dinilai.",
    viewReport: "Lihat laporan →",
    dateWarningTitle: "Peringatan Rentang Tanggal Jawaban",
    dateWarning: "Rentang tanggal pengambilan jawaban dalam sesi ini melebihi batas hari yang ditentukan. Karakteristik atau versi platform AI dapat berubah dari hari ke hari.",
    info: "Informasi sesi manual",
    manual: "Manual",
    created: "Dibuat pada {when}",
    product: "Produk AI",
    site: "Situs Platform",
    openSite: "Buka situs {name} ↗",
    params: "Parameter / Paket",
    purpose: "Tujuan",
    filter: "Filter Kasus",
    perCase: "Percobaan per Kasus",
    times: "{count} kali",
    differentTitle: "Jumlah percobaan berbeda dari standar pengukuran otomatis ({count}x)",
    different: "Jumlah percobaan berbeda",
    finished: "Selesai",
    actions: "Progres dan tindakan sesi",
    progressTitle: "Progres Pengisian",
    between: " dari ",
    answers: " jawaban terisi ({percent}%)",
    unfilled: "Hanya yang belum terisi",
    finishNeedsAnswers: "Semua jawaban harus terisi sebelum dapat ditandai selesai.",
    finishReady: "Tandai sesi ini selesai secara final.",
    finish: "Tandai Selesai",
    gradingWait: "Penilaian sesi ini sedang berjalan. Tunggu sampai selesai.",
    grade: "Kirim untuk Dinilai",
    gradingToast: "Penilaian sesi “{label}” berjalan di latar belakang.",
  },
  en: {
    noAnswers: "This session has no answers to fill in.",
    remaining: "Fill in {count} more answers to enable this button.",
    gradeNeedsAnswers: "Every answer must be filled in before the session can be sent for grading.",
    gradingBackground: "Grading for this session is running in the background.",
    sendToGrade: "Send this session for grading.",
    gradedToast: "Session “{label}” finished grading.",
    viewReport: "View report →",
    dateWarningTitle: "Answer date-range warning",
    dateWarning: "The range of dates when answers were collected in this session exceeds the set number of days. The AI platform's behavior or version can change from day to day.",
    info: "Manual session information",
    manual: "Manual",
    created: "Created on {when}",
    product: "AI product",
    site: "Platform site",
    openSite: "Open the {name} site ↗",
    params: "Parameters / plan",
    purpose: "Purpose",
    filter: "Case filter",
    perCase: "Attempts per case",
    times: "{count} times",
    differentTitle: "The number of attempts differs from the automatic measurement standard ({count}x)",
    different: "Attempt count differs",
    finished: "Finished",
    actions: "Session progress and actions",
    progressTitle: "Filling progress",
    between: " of ",
    answers: " answers filled in ({percent}%)",
    unfilled: "Unfilled only",
    finishNeedsAnswers: "Every answer must be filled in before the session can be marked finished.",
    finishReady: "Mark this session finished for good.",
    finish: "Mark finished",
    gradingWait: "Grading for this session is running. Wait until it finishes.",
    grade: "Send for grading",
    gradingToast: "Grading for session “{label}” is running in the background.",
  },
});

type HeaderCopy = (typeof COPY)["id"];

function missingAnswersReason(remainingAnswers: number, copy: HeaderCopy): string {
  if (remainingAnswers <= 0) return copy.noAnswers;
  return fill(copy.remaining, { count: remainingAnswers });
}

function gradeButtonTitle(isAllFilled: boolean, gradingActive: boolean, copy: HeaderCopy): string {
  if (!isAllFilled) return copy.gradeNeedsAnswers;
  if (gradingActive) return copy.gradingBackground;
  return copy.sendToGrade;
}

export function ManualSessionHeader({
  session,
  role,
  unfilledOnly,
  onToggleUnfilled,
  onSessionUpdated,
  gradingGateway = httpGradingGateway,
}: Readonly<{
  session: ManualSessionDetail;
  role: Role | null;
  unfilledOnly: boolean;
  onToggleUnfilled: (unfilled: boolean) => void;
  onSessionUpdated: () => void;
  gradingGateway?: GradingGateway;
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [gradeDialog, setGradeDialog] = useState<"grade" | "retry" | null>(null);
  const { showToast } = useToast();
  const isAdmin = role === "admin";
  const reportHref = `/reports/sessions/${encodeURIComponent(session.id)}`;
  // K-13 (SCRUM-285): penilaian berjalan di latar belakang. Halaman ini tidak punya tabel skor, jadi
  // saat run selesai sesi dimuat ulang (status Dinilai) dan laporannya ditawarkan lewat toast.
  const results = useSessionResults(session.id, gradingGateway);
  const grading = useGradingProgress(session.id, {
    enabled: isAdmin,
    gateway: gradingGateway,
    onSettled: (run) => {
      results.reload();
      onSessionUpdated();
      if (run.status === "finished") {
        showToast(fill(copy.gradedToast, { label: session.label }), { label: copy.viewReport, href: reportHref });
      }
    },
  });

  const isAllFilled =
    session.total_answers > 0 && session.filled_answers === session.total_answers;
  const isFinalized = session.status === "finalized";
  // AC12: Otomatis standarnya 3 kali, manual standarnya 1 kali.
  // Bila jumlah percobaan berbeda dari sesi otomatis (3), tampilkan penanda.
  const hasDifferentRepetitions =
    session.repetitions !== AUTOMATIC_SESSION_STANDARD_REPETITIONS;

  const percent =
    session.total_answers > 0
      ? Math.round((session.filled_answers / session.total_answers) * 100)
      : 0;
  const remainingAnswers = session.total_answers - session.filled_answers;
  const actionsBlockedReason = isAdmin && !isAllFilled ? missingAnswersReason(remainingAnswers, copy) : null;
  const gradeBlockedReason = actionsBlockedReason ?? (isAdmin && grading.active ? copy.gradingWait : null);
  const actionsReasonId = useId();

  function handleFinalized() {
    setIsFinalizeOpen(false);
    onSessionUpdated();
  }

  return (
    <div className="space-y-6">
      {/* AC13: Peringatan bila rentang tanggal pengambilan jawaban melebihi batas hari */}
      {session.date_range_warning && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-xs"
        >
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-semibold">{copy.dateWarningTitle}</p>
              <p className="mt-0.5 text-amber-800">{copy.dateWarning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ringkasan Metadata Sesi */}
      <section
        aria-label={copy.info}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{session.label}</h1>
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                {copy.manual}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {fill(copy.created, { when: formatWib(session.created_at) })}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <ScoreDownloadButton
              session={{
                id: session.id,
                status: session.status,
                session_type: "manual",
                accepted_as_is_at: null,
                accepted_as_is_reason: null,
              }}
              grading={gradingOf(results)}
            />
            <SessionStatusBadge status={session.status} />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">{copy.product}</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {unknownName(session.product_name, locale)}
              {session.vendor_name && (
                <span className="block text-xs font-normal text-slate-500">
                  {session.vendor_name}
                </span>
              )}
            </dd>
          </div>

          {session.site_url && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase">{copy.site}</dt>
              <dd className="mt-0.5">
                <a
                  href={session.site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                  {fill(copy.openSite, { name: session.product_name ?? "" })}
                </a>
              </dd>
            </div>
          )}

          {session.manual_params && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase">{copy.params}</dt>
              <dd className="mt-0.5 text-slate-800 text-xs">{session.manual_params}</dd>
            </div>
          )}

          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">{copy.purpose}</dt>
            <dd className="mt-0.5 text-slate-900">
              {measurementPurposeLabel(session.purpose, locale)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">{copy.filter}</dt>
            <dd className="mt-0.5 text-slate-900">
              {caseFilterLabel(session.case_filter, locale)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">{copy.perCase}</dt>
            <dd className="mt-0.5 text-slate-900 flex items-center gap-2">
              <span>{fill(copy.times, { count: session.repetitions })}</span>
              {/* AC12: Penanda bila pengulangan berbeda dari standar sesi otomatis */}
              {hasDifferentRepetitions && (
                <span
                  title={fill(copy.differentTitle, { count: AUTOMATIC_SESSION_STANDARD_REPETITIONS })}
                  className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 border border-sky-200"
                >
                  {copy.different}
                </span>
              )}
            </dd>
          </div>

          {session.finalized_at && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase">{copy.finished}</dt>
              <dd className="mt-0.5 text-slate-900">
                {formatWib(session.finalized_at)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* AC8: Progres "X dari N jawaban terisi" & Aksi Sesi */}
      <section
        aria-label={copy.actions}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">{copy.progressTitle}</h2>
            <p className="text-sm font-medium text-slate-700">
              <span className="text-indigo-600 font-bold">{session.filled_answers}</span>
              {copy.between}
              <span className="font-bold">{session.total_answers}</span>
              {fill(copy.answers, { percent })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Belum Terisi (AC8) */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-md border border-slate-200 transition-colors">
              <input
                type="checkbox"
                checked={unfilledOnly}
                onChange={(e) => onToggleUnfilled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
              />
              <span>{copy.unfilled}</span>
            </label>

            {/* Tombol Tandai Selesai (AC8) */}
            {isAdmin && !isFinalized && (
              <button
                type="button"
                disabled={actionsBlockedReason !== null}
                onClick={() => setIsFinalizeOpen(true)}
                aria-describedby={actionsBlockedReason ? actionsReasonId : undefined}
                title={!isAllFilled ? copy.finishNeedsAnswers : copy.finishReady}
                className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {copy.finish}
              </button>
            )}

            {/* Tombol Nilai untuk Admin (AC8, AC9) */}
            {isAdmin && (
              <button
                type="button"
                disabled={gradeBlockedReason !== null}
                onClick={() => setGradeDialog("grade")}
                aria-describedby={gradeBlockedReason ? actionsReasonId : undefined}
                title={gradeButtonTitle(isAllFilled, grading.active, copy)}
                className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {copy.grade}
              </button>
            )}
          </div>
        </div>

        {gradeBlockedReason && (
          <p id={actionsReasonId} className="text-xs text-ink-soft sm:text-right">
            {gradeBlockedReason}
          </p>
        )}

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              isAllFilled ? "bg-emerald-600" : "bg-indigo-600"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <GradingProgressBar progress={grading} onRetry={isAdmin ? () => setGradeDialog("retry") : undefined} />
      </section>

      {isFinalizeOpen && (
        <FinalizeSessionDialog
          sessionId={session.id}
          sessionLabel={session.label}
          onFinalized={handleFinalized}
          onClose={() => setIsFinalizeOpen(false)}
        />
      )}

      {gradeDialog !== null && (
        <GradeSessionDialog
          session={{ id: session.id, label: session.label }}
          gateway={gradingGateway}
          {...(gradeDialog === "retry" ? RETRY_GRADING_DIALOG : {})}
          onQueued={(queued) => {
            setGradeDialog(null);
            grading.started(queued);
            showToast(fill(copy.gradingToast, { label: session.label }));
          }}
          onClose={(afterError) => {
            setGradeDialog(null);
            if (afterError) {
              onSessionUpdated();
              // GRADING_IN_PROGRESS: run lain sudah berjalan, jadi progresnya ikut ditampilkan.
              grading.reload();
            }
          }}
        />
      )}
    </div>
  );
}
