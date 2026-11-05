"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { acceptErrorMessage } from "@/lib/runs/sessionAccept";
import { clearAcceptAsIs } from "@/lib/runs/sessionControlApi";
import type { SessionAcceptResponse, SessionDetail } from "@/types/measurement";

/**
 * Hapus tanda terima apa adanya (PBI-12 AC9): sesi kembali menjadi Selesai dengan kegagalan,
 * jadi bisa dicoba ulang lagi (server#97: retry ditolak selama tanda ada).
 */
export function ClearAcceptAsIsDialog({
  session,
  onCleared,
  onClose,
}: Readonly<{
  session: Pick<SessionDetail, "id" | "label">;
  onCleared: (record: SessionAcceptResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  return (
    <ConfirmDialog
      title="Hapus tanda terima apa adanya?"
      confirmLabel="Hapus tanda"
      busyLabel="Menghapus…"
      onConfirm={() => clearAcceptAsIs(session.id)}
      errorMessage={acceptErrorMessage}
      onDone={onCleared}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        Sesi “{session.label}” tidak lagi dianggap selesai sepenuhnya dan bisa dicoba ulang lagi.
      </p>
    </ConfirmDialog>
  );
}
