"use client";

import { useId, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { useSessionResults } from "@/hooks/useSessionResults";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { canGrade } from "@/lib/grading/gradingRules";
import type { Role } from "@/types";
import type { SessionDetail } from "@/types/measurement";
import { GradeSessionDialog } from "./GradeSessionDialog";
import { GradingResultsBody } from "./GradingResultsBody";

type GradingSession = Pick<SessionDetail, "id" | "label" | "status" | "archived_at">;

/**
 * Bagian "Hasil penilaian" di halaman detail sesi (PBI-14 AC6, AC8). Penyusun: memuat hasil lewat
 * gateway, memutuskan tombol Nilai lewat canGrade, lalu menyerahkan tampilan ke GradingResultsBody.
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

      <GradingResultsBody
        results={results}
        gradeAction={gradable ? { label: "Nilai", onClick: () => setDialogOpen(true) } : undefined}
      />

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
