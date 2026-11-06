"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { regradeErrorMessage } from "@/lib/rubrics/rubricErrors";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { GradingRun, RubricVersion } from "@/types/rubric";
import { GradingHistoryList } from "./GradingHistoryList";

/**
 * Konfirmasi Nilai ulang dengan versi rubrik terbaru (PBI-14 AC7). Kalimatnya menjelaskan yang
 * diminta AC7: hasil lama tetap tersimpan dan tetap memakai rubrik lamanya, hasil baru ditandai
 * Terbaru. Pending, kunci tombol, dan pesan error datang dari ConfirmDialog; gateway disuntikkan.
 */
export function RegradeDialog({
  sessionId,
  version,
  runs,
  gateway = httpRubricsGateway,
  onRegraded,
  onClose,
}: Readonly<{
  sessionId: string;
  version: RubricVersion;
  runs: GradingRun[];
  gateway?: RubricsGateway;
  onRegraded: (run: GradingRun) => void;
  onClose: (afterError: boolean) => void;
}>) {
  return (
    <ConfirmDialog
      title="Nilai ulang dengan versi terbaru?"
      confirmLabel="Nilai ulang"
      busyLabel="Memulai…"
      onConfirm={() => gateway.regrade(sessionId, { rubric_version_id: version.id })}
      errorMessage={regradeErrorMessage}
      onDone={onRegraded}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        {`Sesi ini akan dinilai ulang dengan Versi ${version.version_no}. Hasil lama tetap tersimpan dan tetap memakai rubrik lamanya. Hasil baru ditandai Terbaru.`}
      </p>
      <div className="mt-3">
        <GradingHistoryList runs={runs} />
      </div>
    </ConfirmDialog>
  );
}
