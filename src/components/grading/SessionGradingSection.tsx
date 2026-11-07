"use client";

import { useId, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { useSessionResults } from "@/hooks/useSessionResults";
import { formatWib } from "@/lib/datetime/formatWib";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { canGrade } from "@/lib/grading/gradingRules";
import type { Role } from "@/types";
import type { SessionGradingResponse } from "@/types/grading";
import type { SessionDetail } from "@/types/measurement";
import { GradeSessionDialog } from "./GradeSessionDialog";
import { SessionScoreSummary } from "./SessionScoreSummary";
import { SessionScoreTable } from "./SessionScoreTable";

type GradingSession = Pick<SessionDetail, "id" | "label" | "status" | "archived_at">;

/**
 * Bagian "Hasil penilaian" di halaman detail sesi (PBI-14 AC6, AC8). Penyusun: memuat hasil lewat
 * gateway, memutuskan tombol Nilai lewat canGrade, lalu menyerahkan tampilan ke komponen murni.
 * Setelah Nilai, hasil dimuat ulang dari server, jadi tabel selalu yang sudah disamarkan sesuai peran.
 */
export function SessionGradingSection({
  session,
  role,
  gateway = httpGradingGateway,
}: Readonly<{ session: GradingSession; role: Role | null; gateway?: GradingGateway }>) {
  const headingId = useId();
  const { showToast } = useToast();
  const results = useSessionResults(session.id, gateway);
  const [dialogOpen, setDialogOpen] = useState(false);

  const graded = results.status === "ready" && results.data !== null;
  const gradable = results.status === "ready" && canGrade({ session, role, graded });

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-base font-semibold text-slate-900">
        Hasil penilaian
      </h2>

      {results.status === "loading" && <LoadingState />}
      {results.status === "error" && <ErrorState variant="card" message={results.message} onRetry={results.reload} />}
      {results.status === "ready" && results.data === null && (
        <EmptyState
          title="Sesi ini belum dinilai."
          description="Hasil tampil di sini setelah Admin menilai sesi ini."
          action={gradable ? { label: "Nilai", onClick: () => setDialogOpen(true) } : undefined}
          className="rounded-lg border border-slate-200 bg-white"
        />
      )}
      {results.status === "ready" && results.data !== null && <GradingResult result={results.data} />}

      {dialogOpen && (
        <GradeSessionDialog
          session={session}
          gateway={gateway}
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

function GradingResult({ result }: Readonly<{ result: SessionGradingResponse }>) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Versi rubrik {result.rubric_version} · Dinilai {formatWib(result.triggered_at)}
      </p>
      <SessionScoreSummary scores={result.scores} />
      <SessionScoreTable cases={result.cases ?? []} rubricVersion={result.rubric_version} />
    </div>
  );
}
