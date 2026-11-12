"use client";

import { useState } from "react";

import { JudgeProviderSelect } from "@/components/providers/JudgeProviderSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { gradeErrorMessage } from "@/lib/grading/gradingRules";
import type { SessionGradingResponse } from "@/types/grading";
import type { SessionDetail } from "@/types/measurement";

/**
 * Konfirmasi tombol Nilai (PBI-14 AC6). Penilai LLM memakai anggaran tersendiri, jadi Admin diberi
 * tahu sebelum memakainya. LLM judge dipilih di sini, bukan saat membuat sesi (K-14, SCRUM-282), jadi
 * tombol Nilai mati sampai judge dipilih. Kunci tombol, Escape dan pesan penolakan datang dari
 * ConfirmDialog. Dipakai juga oleh "Kirim untuk Dinilai" di sesi manual.
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
  const [judgeId, setJudgeId] = useState("");

  return (
    <ConfirmDialog
      title="Nilai sesi ini?"
      confirmLabel="Nilai"
      busyLabel="Menilai…"
      confirmDisabled={judgeId === ""}
      onConfirm={() => gateway.grade(session.id, { judgeProviderId: judgeId })}
      errorMessage={gradeErrorMessage}
      onDone={onGraded}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        Jawaban yang sudah masuk di sesi “{session.label}” dinilai dengan rubrik versi aktif, lewat aturan
        deterministik dan penilai LLM.
      </p>
      <p className="mt-2 text-sm text-slate-600">Biaya penilai LLM dihitung ke anggaran penilai, terpisah dari anggaran produk.</p>
      <div className="mt-3">
        <JudgeProviderSelect value={judgeId} onChange={setJudgeId} api={judgeApi} />
      </div>
    </ConfirmDialog>
  );
}
