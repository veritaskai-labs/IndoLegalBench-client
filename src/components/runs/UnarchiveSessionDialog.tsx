"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { unarchiveSession } from "@/lib/runs/runsApi";
import { unarchiveErrorMessage } from "@/lib/runs/sessionRules";
import type { SessionListItem } from "@/types/measurement";

/**
 * Konfirmasi Kembalikan (PBI-11 AC10): sesi arsip tampil lagi di daftar utama, status dan datanya
 * tidak berubah. Kalau server menolak, onClose(true) memberi tahu halaman bahwa daftarnya mungkin
 * sudah tidak sesuai server, jadi perlu dimuat ulang.
 */
export function UnarchiveSessionDialog({
  session,
  onUnarchived,
  onClose,
}: Readonly<{
  session: Pick<SessionListItem, "id" | "label">;
  onUnarchived: () => void;
  onClose: (afterError: boolean) => void;
}>) {
  return (
    <ConfirmDialog
      title="Kembalikan sesi?"
      confirmLabel="Kembalikan"
      busyLabel="Mengembalikan…"
      onConfirm={async () => {
        await unarchiveSession(session.id);
      }}
      errorMessage={unarchiveErrorMessage}
      onDone={onUnarchived}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        Sesi “{session.label}” kembali ke daftar utama; status dan datanya tidak berubah.
      </p>
    </ConfirmDialog>
  );
}
