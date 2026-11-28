"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { controlErrorMessage } from "@/lib/runs/sessionControl";
import { resumeSession } from "@/lib/runs/sessionControlApi";
import type { SessionDetail, SessionResumeResponse } from "@/types/measurement";

const COPY = messages({
  id: {
    title: "Lanjutkan tanpa versi model terverifikasi?",
    confirm: "Tetap lanjutkan",
    busy: "Melanjutkan…",
    body: "Penyedia belum pernah melaporkan versi model untuk produk ini, jadi belum bisa dipastikan versinya sama dengan saat sesi “{label}” dimulai. Bila dilanjutkan, sesi ditandai versi model belum terverifikasi.",
  },
  en: {
    title: "Resume without a verified model version?",
    confirm: "Resume anyway",
    busy: "Resuming…",
    body: "The provider has never reported a model version for this product, so it cannot be confirmed that the version matches when session “{label}” started. If you resume, the session is marked as having an unverified model version.",
  },
});

/**
 * Konfirmasi Admin setelah 409 MODEL_VERSION_CONFIRMATION_REQUIRED (PBI-12 AC8, server#102): penyedia
 * belum pernah memberi versi model, jadi server tidak bisa memastikan versinya sama dengan saat sesi
 * dimulai. Sesi tetap bisa dilanjutkan, dengan penanda versi belum terverifikasi.
 */
export function ConfirmResumeDialog({
  session,
  onResumed,
  onClose,
}: Readonly<{
  session: Pick<SessionDetail, "id" | "label">;
  onResumed: (result: SessionResumeResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  return (
    <ConfirmDialog
      title={copy.title}
      confirmLabel={copy.confirm}
      busyLabel={copy.busy}
      onConfirm={() => resumeSession(session.id, { confirmUnverifiedVersion: true })}
      errorMessage={(error) => controlErrorMessage(error, locale)}
      onDone={onResumed}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">{fill(copy.body, { label: session.label })}</p>
    </ConfirmDialog>
  );
}
