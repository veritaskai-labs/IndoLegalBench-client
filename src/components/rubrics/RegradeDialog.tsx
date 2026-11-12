"use client";

import { useId, useState } from "react";

import { JudgeProviderSelect } from "@/components/providers/JudgeProviderSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { gradeErrorMessage } from "@/lib/grading/gradingRules";
import { versionLabel } from "@/lib/rubrics/rubricVersion";
import type { SessionGradingResponse } from "@/types/grading";
import type { RubricVersionSummary } from "@/types/rubric";

const BOX = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

/**
 * Nilai ulang (PBI-14 AC7, K-17/K-18): Admin memilih versi rubrik dan LLM judge. Jawaban sama bisa
 * dinilai judge lain; hasil lama tetap tersimpan dengan rubrik dan judge-nya sendiri. Pending, kunci
 * tombol, dan pesan error datang dari ConfirmDialog; gateway dan daftar judge disuntikkan.
 */
export function RegradeDialog({
  session,
  versions,
  defaultVersion,
  defaultJudgeId,
  gateway = httpGradingGateway,
  judgeApi,
  onRegraded,
  onClose,
}: Readonly<{
  session: { id: string };
  versions: RubricVersionSummary[];
  /** Versi terbaru dari regradeAvailability. */
  defaultVersion: RubricVersionSummary;
  /** Judge hasil terbaru; kosong bila run itu belum mencatat judge. */
  defaultJudgeId: string;
  gateway?: GradingGateway;
  judgeApi?: JudgeOptionsApi;
  onRegraded: (result: SessionGradingResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const versionId = useId();
  const [version, setVersion] = useState(versionLabel(defaultVersion.version_no));
  const [judgeId, setJudgeId] = useState(defaultJudgeId);
  const newestFirst = [...versions].sort((a, b) => b.version_no - a.version_no);

  return (
    <ConfirmDialog
      title="Nilai ulang sesi ini?"
      confirmLabel="Nilai ulang"
      busyLabel="Menilai ulang…"
      confirmDisabled={judgeId === ""}
      onConfirm={() => gateway.grade(session.id, { rubricVersion: version, judgeProviderId: judgeId })}
      errorMessage={gradeErrorMessage}
      onDone={onRegraded}
      onClose={onClose}
    >
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor={versionId} className="block text-sm font-medium text-slate-700">
            Versi rubrik
          </label>
          <select id={versionId} value={version} onChange={(event) => setVersion(event.target.value)} className={BOX}>
            {newestFirst.map((item) => (
              <option key={item.id} value={versionLabel(item.version_no)}>
                {`Versi ${item.version_no}`}
              </option>
            ))}
          </select>
        </div>
        <JudgeProviderSelect value={judgeId} onChange={setJudgeId} api={judgeApi} />
        <p className="text-sm text-slate-600">
          Hasil lama tetap tersimpan dengan rubrik dan penilainya sendiri. Hasil baru ditandai Terbaru.
        </p>
      </div>
    </ConfirmDialog>
  );
}
