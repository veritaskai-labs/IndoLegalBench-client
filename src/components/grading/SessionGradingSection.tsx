"use client";

import { useId, useState } from "react";

import { RegradeSection } from "@/components/rubrics/RegradeSection";
import { useToast } from "@/components/ui/Toast";
import { useGradingProgress } from "@/hooks/useGradingProgress";
import { useGradingRun } from "@/hooks/useGradingRun";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { useSessionResults } from "@/hooks/useSessionResults";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { canGrade, isGradableSession, RETRY_GRADING_DIALOG } from "@/lib/grading/gradingRules";
import { olderRunNote } from "@/lib/rubrics/gradingRun";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { Role } from "@/types";
import type { SessionDetail } from "@/types/measurement";
import { GradeSessionDialog } from "./GradeSessionDialog";
import { GradingProgressBar } from "./GradingProgressBar";
import { GradingResultsBody } from "./GradingResultsBody";

type GradingSession = Pick<SessionDetail, "id" | "label" | "status" | "archived_at">;

/**
 * Bagian "Hasil penilaian" di halaman detail sesi (PBI-14 AC6, AC8). Penyusun: memuat hasil lewat
 * gateway, memutuskan tombol Nilai lewat canGrade, lalu menyerahkan tampilan ke GradingResultsBody.
 * Setelah Nilai atau Nilai ulang (PBI-14 AC7), hasil dimuat ulang dari server, jadi tabel selalu yang
 * sudah disamarkan sesuai peran. Admin bisa membuka run lama dari riwayat (K-17/K-18); skornya
 * menggantikan hasil terbaru dengan keterangan dan jalan kembali.
 *
 * Penilaian berjalan di latar belakang (K-13, SCRUM-285): Admin melihat progresnya di sini, tombol
 * Nilai mati selama run antre atau berjalan, dan hasil dimuat ulang sendiri begitu run berakhir.
 */
type SessionResults = ReturnType<typeof useSessionResults>;

type GradingSectionProps = Readonly<{
  session: GradingSession;
  role: Role | null;
  gateway?: GradingGateway;
  rubricsGateway?: RubricsGateway;
  judgeApi?: JudgeOptionsApi;
}>;

export function SessionGradingSection({
  results,
  ...props
}: GradingSectionProps & { results?: SessionResults }) {
  if (results !== undefined) return <SessionGradingBody {...props} results={results} />;
  return <SessionGradingOwner {...props} />;
}

function SessionGradingOwner(props: GradingSectionProps) {
  const results = useSessionResults(props.session.id, props.gateway);
  return <SessionGradingBody {...props} results={results} />;
}

function SessionGradingBody({
  session,
  role,
  gateway = httpGradingGateway,
  rubricsGateway = httpRubricsGateway,
  judgeApi,
  results,
}: GradingSectionProps & { results: SessionResults }) {
  const headingId = useId();
  const { showToast } = useToast();
  const progress = useGradingProgress(session.id, {
    enabled: role === "admin",
    gateway,
    onSettled: (run) => {
      results.reload();
      if (run.status === "finished") showToast(`Sesi “${session.label}” selesai dinilai.`);
    },
  });
  const [dialog, setDialog] = useState<"grade" | "retry" | null>(null);
  const [chosenRunId, setChosenRunId] = useState<string | null>(null);

  const latest = results.status === "ready" ? results.data : null;
  // Run terbaru sudah ada di results, jadi hanya run lain yang diminta ke server.
  const olderRunId = chosenRunId !== null && chosenRunId !== latest?.grading_run_id ? chosenRunId : null;
  const older = useGradingRun(session.id, olderRunId, gateway);
  const shown = olderRunId === null ? results : older;

  const graded = latest !== null;
  const gradable = results.status === "ready" && canGrade({ session, role, graded });

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-base font-semibold text-slate-900">
        Hasil penilaian
      </h2>

      <GradingProgressBar
        progress={progress}
        onRetry={role === "admin" && isGradableSession(session) ? () => setDialog("retry") : undefined}
      />

      {olderRunId !== null && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {older.status === "ready" && older.data !== null && <span>{olderRunNote(older.data.triggered_at)}</span>}
          <button type="button" onClick={() => setChosenRunId(null)} className="font-medium underline">
            Kembali ke hasil terbaru
          </button>
        </div>
      )}

      <GradingResultsBody
        results={shown}
        rubricHref={role === "admin" ? "/admin/rubrics" : undefined}
        gradeAction={gradable ? { label: "Nilai", onClick: () => setDialog("grade"), disabled: progress.active } : undefined}
      />

      {latest !== null && (
        <RegradeSection
          session={session}
          role={role}
          latest={latest}
          gradingGateway={gateway}
          rubricsGateway={rubricsGateway}
          judgeApi={judgeApi}
          selectedRunId={olderRunId}
          onSelectRun={setChosenRunId}
          onChanged={() => {
            setChosenRunId(null);
            results.reload();
            progress.reload();
          }}
          gradingActive={progress.active}
          onQueued={(queued) => {
            setChosenRunId(null);
            progress.started(queued);
          }}
        />
      )}

      {dialog !== null && (
        <GradeSessionDialog
          session={session}
          {...(dialog === "retry" ? RETRY_GRADING_DIALOG : {})}
          gateway={gateway}
          judgeApi={judgeApi}
          onQueued={(queued) => {
            setDialog(null);
            progress.started(queued);
            showToast(`Penilaian sesi “${session.label}” berjalan di latar belakang.`);
          }}
          onClose={(afterError) => {
            setDialog(null);
            // Setelah penolakan, keadaan yang tampil mungkin sudah berbeda dari server: Admin lain sudah
            // menilai, atau run lain sedang berjalan (GRADING_IN_PROGRESS) dan progresnya perlu diikuti.
            if (afterError) {
              results.reload();
              progress.reload();
            }
          }}
        />
      )}
    </section>
  );
}
