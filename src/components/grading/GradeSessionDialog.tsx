"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { gradeErrorMessage } from "@/lib/grading/gradingRules";
import type { SessionGradingResponse } from "@/types/grading";
import type { SessionDetail } from "@/types/measurement";

/**
 * Konfirmasi tombol Nilai (PBI-14 AC6). Penilai LLM memakai anggaran tersendiri, jadi Admin diberi
 * tahu sebelum memakainya. Kunci tombol, Escape dan pesan penolakan datang dari ConfirmDialog.
 */
export function GradeSessionDialog({
  session,
  gateway = httpGradingGateway,
  onGraded,
  onClose,
}: Readonly<{
  session: Pick<SessionDetail, "id" | "label">;
  gateway?: GradingGateway;
  onGraded: (result: SessionGradingResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  return (
    <ConfirmDialog
      title="Nilai sesi ini?"
      confirmLabel="Nilai"
      busyLabel="Menilai…"
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
    </ConfirmDialog>
  );
}
