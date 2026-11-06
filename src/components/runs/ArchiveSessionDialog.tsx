"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { archiveSession } from "@/lib/runs/runsApi";
import { archiveErrorMessage } from "@/lib/runs/sessionRules";
import type { SessionListItem } from "@/types/measurement";

/**
 * Konfirmasi Arsipkan (PBI-11 AC10): sesi disembunyikan dari daftar, datanya tetap ada.
 * Kalau server menolak, onClose(true) memberi tahu halaman bahwa daftarnya mungkin sudah
 * tidak sesuai server, jadi perlu dimuat ulang.
 */
export function ArchiveSessionDialog({
  session,
  onArchived,
  onClose,
}: Readonly<{
  session: Pick<SessionListItem, "id" | "label">;
  onArchived: () => void;
  onClose: (afterError: boolean) => void;
}>) {
  return (
    <ConfirmDialog
      title="Arsipkan sesi?"
      confirmLabel="Arsipkan"
      busyLabel="Mengarsipkan…"
      onConfirm={async () => {
        await archiveSession(session.id);
      }}
      errorMessage={archiveErrorMessage}
      onDone={onArchived}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        Sesi “{session.label}” disembunyikan dari daftar. Datanya tidak dihapus dan tetap tersimpan.
      </p>
    </ConfirmDialog>
  );
}
