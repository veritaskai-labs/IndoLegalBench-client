"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { finalizeManualSession, manualErrorMessage } from "@/lib/runs/manualRunsApi";
import type { ManualFinalizeResponse } from "@/types/measurement";

export function FinalizeSessionDialog({
  sessionId,
  sessionLabel,
  onFinalized,
  onClose,
}: Readonly<{
  sessionId: string;
  sessionLabel: string;
  onFinalized: (response: ManualFinalizeResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  return (
    <ConfirmDialog<ManualFinalizeResponse>
      title="Tandai Selesai Pengukuran Manual"
      confirmLabel="Tandai Selesai"
      busyLabel="Menandai selesai…"
      dismissLabel="Batal"
      onConfirm={() => finalizeManualSession(sessionId)}
      errorMessage={(err) => manualErrorMessage(err, "Gagal menandai sesi selesai. Coba lagi.")}
      onDone={onFinalized}
      onClose={onClose}
    >
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          Anda akan menandai sesi <strong className="text-slate-900 font-medium">“{sessionLabel}”</strong> sebagai selesai.
        </p>
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <strong>Perhatian:</strong> Sesi yang sudah ditandai selesai bersifat final dan <strong>tidak dapat dibuka kembali</strong> untuk pengisian atau perbaikan jawaban.
        </p>
      </div>
    </ConfirmDialog>
  );
}
