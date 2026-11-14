"use client";

import { useId, useState } from "react";

import { RegradeSection } from "@/components/rubrics/RegradeSection";
import { useToast } from "@/components/ui/Toast";
import { useGradingRun } from "@/hooks/useGradingRun";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { useSessionResults } from "@/hooks/useSessionResults";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { canGrade } from "@/lib/grading/gradingRules";
import { olderRunNote } from "@/lib/rubrics/gradingRun";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { Role } from "@/types";
import type { SessionDetail } from "@/types/measurement";
import { GradeSessionDialog } from "./GradeSessionDialog";
import { GradingResultsBody } from "./GradingResultsBody";

type GradingSession = Pick<SessionDetail, "id" | "label" | "status" | "archived_at">;

/**
 * Bagian "Hasil penilaian" di halaman detail sesi (PBI-14 AC6, AC8). Penyusun: memuat hasil lewat
 * gateway, memutuskan tombol Nilai lewat canGrade, lalu menyerahkan tampilan ke GradingResultsBody.
 * Setelah Nilai atau Nilai ulang (PBI-14 AC7), hasil dimuat ulang dari server, jadi tabel selalu yang
 * sudah disamarkan sesuai peran. Admin bisa membuka run lama dari riwayat (K-17/K-18); skornya
 * menggantikan hasil terbaru dengan keterangan dan jalan kembali.
 */
export function SessionGradingSection({
  session,
  role,
  gateway = httpGradingGateway,
  rubricsGateway = httpRubricsGateway,
  judgeApi,
}: Readonly<{
  session: GradingSession;
  role: Role | null;
  gateway?: GradingGateway;
  rubricsGateway?: RubricsGateway;
  judgeApi?: JudgeOptionsApi;
}>) {
  const headingId = useId();
  const { showToast } = useToast();
  const results = useSessionResults(session.id, gateway);
  const [dialogOpen, setDialogOpen] = useState(false);
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
        gradeAction={gradable ? { label: "Nilai", onClick: () => setDialogOpen(true) } : undefined}
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
          }}
        />
      )}

      {dialogOpen && (
        <GradeSessionDialog
          session={session}
          gateway={gateway}
          judgeApi={judgeApi}
          onGraded={() => {
            setDialogOpen(false);
            results.reload();
            showToast(`Sesi “${session.label}” selesai dinilai.`);
          }}
          onClose={(afterError) => {
            setDialogOpen(false);
            // Setelah penolakan, keadaan yang tampil mungkin sudah berbeda dari server (Admin lain sudah menilai).
            if (afterError) results.reload();
          }}
        />
      )}
    </section>
  );
}
