"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CHROME } from "@/lib/i18n/chrome";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { finalizeManualSession, manualErrorMessage } from "@/lib/runs/manualRunsApi";
import type { ManualFinalizeResponse } from "@/types/measurement";

const COPY = messages({
  id: {
    title: "Tandai Selesai Pengukuran Manual",
    confirm: "Tandai Selesai",
    busy: "Menandai selesai…",
    fallback: "Gagal menandai sesi selesai. Coba lagi.",
    before: "Anda akan menandai sesi ",
    after: " sebagai selesai.",
    warning: "Perhatian:",
    finalBefore: "Sesi yang sudah ditandai selesai bersifat final dan ",
    finalEmphasis: "tidak dapat dibuka kembali",
    finalAfter: " untuk pengisian atau perbaikan jawaban.",
  },
  en: {
    title: "Mark the manual measurement finished",
    confirm: "Mark finished",
    busy: "Marking finished…",
    fallback: "Could not mark the session finished. Try again.",
    before: "You are about to mark session ",
    after: " as finished.",
    warning: "Note:",
    finalBefore: "A session marked finished is final and ",
    finalEmphasis: "cannot be reopened",
    finalAfter: " to fill in or correct answers.",
  },
});

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
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const locale = useLocale();
  return (
    <ConfirmDialog<ManualFinalizeResponse>
      title={copy.title}
      confirmLabel={copy.confirm}
      busyLabel={copy.busy}
      dismissLabel={chrome.cancel}
      onConfirm={() => finalizeManualSession(sessionId)}
      errorMessage={(err) => manualErrorMessage(err, copy.fallback, locale)}
      onDone={onFinalized}
      onClose={onClose}
    >
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          {copy.before}
          <strong className="text-slate-900 font-medium">“{sessionLabel}”</strong>
          {copy.after}
        </p>
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <strong>{copy.warning}</strong> {copy.finalBefore}
          <strong>{copy.finalEmphasis}</strong>
          {copy.finalAfter}
        </p>
      </div>
    </ConfirmDialog>
  );
}
