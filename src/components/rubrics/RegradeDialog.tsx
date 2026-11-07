"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { gradeErrorMessage } from "@/lib/grading/gradingRules";
import { versionLabel } from "@/lib/rubrics/rubricVersion";
import type { SessionGradingResponse } from "@/types/grading";
import type { RubricVersionSummary } from "@/types/rubric";
import { GradingHistoryList } from "./GradingHistoryList";

/**
 * Konfirmasi Nilai ulang dengan versi rubrik terbaru (PBI-14 AC7). Kalimatnya menjelaskan yang
 * diminta AC7: hasil lama tetap tersimpan dan tetap memakai rubrik lamanya, hasil baru ditandai
 * Terbaru. Pending, kunci tombol, dan pesan error datang dari ConfirmDialog; gateway disuntikkan.
 */
export function RegradeDialog({
  session,
  version,
  latest,
  gateway = httpGradingGateway,
  onRegraded,
  onClose,
}: Readonly<{
  session: { id: string };
  version: RubricVersionSummary;
  latest: SessionGradingResponse;
  gateway?: GradingGateway;
  onRegraded: (result: SessionGradingResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  return (
    <ConfirmDialog
      title="Nilai ulang dengan versi terbaru?"
      confirmLabel="Nilai ulang"
      busyLabel="Menilai ulang…"
      onConfirm={() => gateway.grade(session.id, versionLabel(version.version_no))}
      errorMessage={gradeErrorMessage}
      onDone={onRegraded}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        {`Sesi ini akan dinilai ulang dengan Versi ${version.version_no}. Hasil lama tetap tersimpan dan tetap memakai rubrik lamanya. Hasil baru ditandai Terbaru.`}
      </p>
      <div className="mt-3">
        <GradingHistoryList runs={[latest]} />
      </div>
    </ConfirmDialog>
  );
}
