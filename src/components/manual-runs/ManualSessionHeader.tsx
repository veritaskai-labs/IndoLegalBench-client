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
import { unknownName } from "@/lib/runs/sessionRules";
import {
  AUTOMATIC_SESSION_STANDARD_REPETITIONS,
  CASE_FILTER_LABEL,
  MEASUREMENT_PURPOSE_LABEL,
} from "@/types/measurement";
import type { Role } from "@/types";
import type { ManualSessionDetail } from "@/types/measurement";

/** Penjelasan tombol "Kirim untuk Dinilai": kenapa mati, atau apa yang dilakukannya. */
function gradeButtonTitle(isAllFilled: boolean, gradingActive: boolean): string {
  if (!isAllFilled) return "Semua jawaban harus terisi sebelum dapat dikirim untuk dinilai.";
  if (gradingActive) return "Penilaian sesi ini sedang berjalan di latar belakang.";
  return "Kirim sesi ini untuk dinilai.";
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
        showToast(`Sesi “${session.label}” selesai dinilai.`, { label: "Lihat laporan →", href: reportHref });
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
  const actionsBlockedReason =
    isAdmin && !isAllFilled && remainingAnswers > 0
      ? `Isi ${remainingAnswers} jawaban lagi untuk mengaktifkan tombol ini.`
      : null;
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
              <p className="font-semibold">Peringatan Rentang Tanggal Jawaban</p>
              <p className="mt-0.5 text-amber-800">
                Rentang tanggal pengambilan jawaban dalam sesi ini melebihi batas hari yang ditentukan.
                Karakteristik atau versi platform AI dapat berubah dari hari ke hari.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ringkasan Metadata Sesi */}
      <section
        aria-label="Informasi sesi manual"
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{session.label}</h1>
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                Manual
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Dibuat pada {formatWib(session.created_at)}
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
            <dt className="text-xs font-medium text-slate-500 uppercase">Produk AI</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {unknownName(session.product_name)}
              {session.vendor_name && (
                <span className="block text-xs font-normal text-slate-500">
                  {session.vendor_name}
                </span>
              )}
            </dd>
          </div>

          {session.site_url && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase">Situs Platform</dt>
              <dd className="mt-0.5">
                <a
                  href={session.site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                  {`Buka situs ${session.product_name} ↗`}
                </a>
              </dd>
            </div>
          )}

          {session.manual_params && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase">Parameter / Paket</dt>
              <dd className="mt-0.5 text-slate-800 text-xs">{session.manual_params}</dd>
            </div>
          )}

          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">Tujuan</dt>
            <dd className="mt-0.5 text-slate-900">
              {MEASUREMENT_PURPOSE_LABEL[session.purpose]}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">Filter Kasus</dt>
            <dd className="mt-0.5 text-slate-900">
              {CASE_FILTER_LABEL[session.case_filter]}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">Percobaan per Kasus</dt>
            <dd className="mt-0.5 text-slate-900 flex items-center gap-2">
              <span>{session.repetitions} kali</span>
              {/* AC12: Penanda bila pengulangan berbeda dari standar sesi otomatis */}
              {hasDifferentRepetitions && (
                <span
                  title={`Jumlah percobaan berbeda dari standar pengukuran otomatis (${AUTOMATIC_SESSION_STANDARD_REPETITIONS}x)`}
                  className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 border border-sky-200"
                >
                  Jumlah percobaan berbeda
                </span>
              )}
            </dd>
          </div>

          {session.finalized_at && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase">Selesai</dt>
              <dd className="mt-0.5 text-slate-900">
                {formatWib(session.finalized_at)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* AC8: Progres "X dari N jawaban terisi" & Aksi Sesi */}
      <section
        aria-label="Progres dan tindakan sesi"
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">Progres Pengisian</h2>
            <p className="text-sm font-medium text-slate-700">
              <span className="text-indigo-600 font-bold">{session.filled_answers}</span> dari{" "}
              <span className="font-bold">{session.total_answers}</span> jawaban terisi ({percent}%)
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
              <span>Hanya yang belum terisi</span>
            </label>

            {/* Tombol Tandai Selesai (AC8) */}
            {isAdmin && !isFinalized && (
              <button
                type="button"
                disabled={!isAllFilled}
                onClick={() => setIsFinalizeOpen(true)}
                aria-describedby={actionsBlockedReason ? actionsReasonId : undefined}
                title={
                  !isAllFilled
                    ? "Semua jawaban harus terisi sebelum dapat ditandai selesai."
                    : "Tandai sesi ini selesai secara final."
                }
                className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Tandai Selesai
              </button>
            )}

            {/* Tombol Nilai untuk Admin (AC8, AC9) */}
            {isAdmin && (
              <button
                type="button"
                disabled={!isAllFilled || grading.active}
                onClick={() => setGradeDialog("grade")}
                aria-describedby={actionsBlockedReason ? actionsReasonId : undefined}
                title={gradeButtonTitle(isAllFilled, grading.active)}
                className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Kirim untuk Dinilai
              </button>
            )}
          </div>
        </div>

        {actionsBlockedReason && (
          <p id={actionsReasonId} className="text-xs text-ink-soft sm:text-right">
            {actionsBlockedReason}
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
            showToast(`Penilaian sesi “${session.label}” berjalan di latar belakang.`);
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
