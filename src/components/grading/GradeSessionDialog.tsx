"use client";

import { useState } from "react";

import { JudgeProviderSelect } from "@/components/providers/JudgeProviderSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useGradeEstimate } from "@/hooks/useGradeEstimate";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { canStartGrading } from "@/lib/grading/gradeEstimate";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { gradeErrorMessage } from "@/lib/grading/gradingRules";
import type { GradingRunQueued } from "@/types/grading";
import type { SessionDetail } from "@/types/measurement";
import { GradeEstimateTable } from "./GradeEstimateTable";

/**
 * Konfirmasi tombol Nilai (PBI-14 AC6). LLM judge dipilih di sini, bukan saat membuat sesi (K-14,
 * SCRUM-282). Biaya penilai LLM memotong anggaran bulanan produk judge di halaman Penyedia (K-16,
 * SCRUM-288), jadi Admin diberi tahu sebelum memakainya lewat tabel perkiraan biaya untuk judge yang
 * dipilih dan rubrik aktif; tombol Nilai baru hidup bila judge
 * dipilih, perkiraan sudah ada, dan anggaran cukup. Kunci tombol, Escape dan pesan penolakan datang
 * dari ConfirmDialog. Dipakai juga oleh "Kirim untuk Dinilai" di sesi manual.
 *
 * Penilaian berjalan di latar belakang (K-13, SCRUM-285): Nilai hanya mengantre run, server membalas
 * 202, dan onQueued meneruskan run itu ke halaman yang menutup dialog lalu mengikuti progresnya.
 *
 * Setelah run gagal, dialog yang sama dipakai untuk "Coba Nilai Ulang" (K-19, SCRUM-290) dengan judul
 * dan label tombol sendiri lewat title dan confirmLabel. Judge dipilih lagi dan biayanya diperkirakan
 * lagi, karena penyebab gagalnya bisa judge, harga, atau anggaran.
 */
export function GradeSessionDialog({
  session,
  gateway = httpGradingGateway,
  judgeApi,
  title = "Nilai sesi ini?",
  confirmLabel = "Nilai",
  onQueued,
  onClose,
}: Readonly<{
  session: Pick<SessionDetail, "id" | "label">;
  gateway?: GradingGateway;
  judgeApi?: JudgeOptionsApi;
  title?: string;
  confirmLabel?: string;
  onQueued: (queued: GradingRunQueued) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const [judgeId, setJudgeId] = useState("");
  // Belum memilih judge berarti belum ada perkiraan (null), bukan perkiraan untuk judge sesi.
  const estimate = useGradeEstimate(session.id, judgeId === "" ? null : { judgeProviderId: judgeId }, gateway, judgeApi);

  return (
    <ConfirmDialog
      title={title}
      confirmLabel={confirmLabel}
      busyLabel="Mengirim…"
      confirmDisabled={judgeId === "" || !canStartGrading(estimate)}
      onConfirm={() => gateway.enqueue(session.id, { judgeProviderId: judgeId })}
      errorMessage={gradeErrorMessage}
      onDone={onQueued}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        Jawaban yang sudah masuk di sesi “{session.label}” dinilai dengan rubrik versi aktif, lewat aturan
        deterministik dan penilai LLM.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Biaya penilai LLM memotong anggaran bulanan produk LLM judge yang dipilih di halaman Penyedia. Sisa
        anggarannya ada di tabel perkiraan.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Penilaian berjalan di latar belakang: dialog ini tertutup begitu penilaian masuk antrean, dan progresnya
        tampil di halaman sesi.
      </p>
      <div className="mt-3">
        <JudgeProviderSelect value={judgeId} onChange={setJudgeId} api={judgeApi} />
      </div>
      <GradeEstimateTable estimate={estimate} />
    </ConfirmDialog>
  );
}
