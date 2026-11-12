"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useGradeEstimate } from "@/hooks/useGradeEstimate";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { canStartGrading } from "@/lib/grading/gradeEstimate";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { gradeErrorMessage } from "@/lib/grading/gradingRules";
import type { SessionGradingResponse } from "@/types/grading";
import type { SessionDetail } from "@/types/measurement";
import { GradeEstimateTable } from "./GradeEstimateTable";

/**
 * Konfirmasi tombol Nilai (PBI-14 AC6). Penilai LLM memakai anggaran tersendiri, jadi Admin diberi
 * tahu sebelum memakainya, lewat tabel perkiraan biaya untuk judge sesi dan rubrik aktif; tombol Nilai
 * baru hidup bila perkiraan sudah ada dan anggaran cukup. Kunci tombol, Escape dan pesan penolakan
 * datang dari ConfirmDialog. Dipakai juga oleh "Kirim untuk Dinilai" di sesi manual.
 */
export function GradeSessionDialog({
  session,
  gateway = httpGradingGateway,
  judgeApi,
  onGraded,
  onClose,
}: Readonly<{
  session: Pick<SessionDetail, "id" | "label">;
  gateway?: GradingGateway;
  judgeApi?: JudgeOptionsApi;
  onGraded: (result: SessionGradingResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const estimate = useGradeEstimate(session.id, {}, gateway, judgeApi);

  return (
    <ConfirmDialog
      title="Nilai sesi ini?"
      confirmLabel="Nilai"
      busyLabel="Menilai…"
      confirmDisabled={!canStartGrading(estimate)}
      onConfirm={() => gateway.grade(session.id)}
      errorMessage={gradeErrorMessage}
      onDone={onGraded}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        Jawaban yang sudah masuk di sesi “{session.label}” dinilai dengan rubrik versi aktif, lewat aturan
        deterministik dan penilai LLM.
      </p>
      <p className="mt-2 text-sm text-slate-600">Biaya penilai LLM dihitung ke anggaran penilai, terpisah dari anggaran produk.</p>
      <GradeEstimateTable estimate={estimate} />
    </ConfirmDialog>
  );
}
