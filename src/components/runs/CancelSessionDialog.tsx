"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { controlErrorMessage } from "@/lib/runs/sessionControl";
import { cancelSession } from "@/lib/runs/sessionControlApi";
import type { SessionControlResponse, SessionDetail } from "@/types/measurement";

/**
 * Konfirmasi Batalkan (PBI-12 AC7). Kalimatnya ditulis persis seperti AC7: hasil yang sudah selesai
 * tersimpan, tetapi sesi tidak dipakai untuk laporan sampai dilanjutkan dan selesai.
 */
export function CancelSessionDialog({
  session,
  onCancelled,
  onClose,
}: Readonly<{
  session: Pick<SessionDetail, "id" | "label" | "progress">;
  onCancelled: (result: SessionControlResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const { completed, total } = session.progress;
  return (
    <ConfirmDialog
      title="Batalkan sesi?"
      confirmLabel="Batalkan sesi"
      busyLabel="Membatalkan…"
      dismissLabel="Kembali"
      onConfirm={() => cancelSession(session.id)}
      errorMessage={controlErrorMessage}
      onDone={onCancelled}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        {`Hasil yang sudah selesai (${completed} dari ${total}) akan tersimpan, tetapi sesi ini tidak dapat dipakai untuk laporan sampai dilanjutkan dan selesai. Lanjutkan membatalkan?`}
      </p>
    </ConfirmDialog>
  );
}
