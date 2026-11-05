"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { controlErrorMessage } from "@/lib/runs/sessionControl";
import { resumeSession } from "@/lib/runs/sessionControlApi";
import type { SessionDetail, SessionResumeResponse } from "@/types/measurement";

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
  return (
    <ConfirmDialog
      title="Lanjutkan tanpa versi model terverifikasi?"
      confirmLabel="Tetap lanjutkan"
      busyLabel="Melanjutkan…"
      onConfirm={() => resumeSession(session.id, { confirmUnverifiedVersion: true })}
      errorMessage={controlErrorMessage}
      onDone={onResumed}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        Penyedia belum pernah melaporkan versi model untuk produk ini, jadi belum bisa dipastikan versinya sama
        dengan saat sesi “{session.label}” dimulai. Bila dilanjutkan, sesi ditandai versi model belum terverifikasi.
      </p>
    </ConfirmDialog>
  );
}
