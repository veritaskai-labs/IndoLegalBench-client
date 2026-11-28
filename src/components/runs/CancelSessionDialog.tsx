"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { controlErrorMessage } from "@/lib/runs/sessionControl";
import { cancelSession } from "@/lib/runs/sessionControlApi";
import type { SessionControlResponse, SessionDetail } from "@/types/measurement";

const COPY = messages({
  id: {
    title: "Batalkan sesi?",
    confirm: "Batalkan sesi",
    busy: "Membatalkan…",
    dismiss: "Kembali",
    body: "Hasil yang sudah selesai ({completed} dari {total}) akan tersimpan, tetapi sesi ini tidak dapat dipakai untuk laporan sampai dilanjutkan dan selesai. Lanjutkan membatalkan?",
  },
  en: {
    title: "Cancel the session?",
    confirm: "Cancel session",
    busy: "Cancelling…",
    dismiss: "Back",
    body: "Results that already finished ({completed} of {total}) will be kept, but this session cannot be used for a report until it is resumed and finished. Continue cancelling?",
  },
});

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
  const copy = useText(COPY);
  const locale = useLocale();
  const { completed, total } = session.progress;
  return (
    <ConfirmDialog
      title={copy.title}
      confirmLabel={copy.confirm}
      busyLabel={copy.busy}
      dismissLabel={copy.dismiss}
      onConfirm={() => cancelSession(session.id)}
      errorMessage={(error) => controlErrorMessage(error, locale)}
      onDone={onCancelled}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">{fill(copy.body, { completed, total })}</p>
    </ConfirmDialog>
  );
}
