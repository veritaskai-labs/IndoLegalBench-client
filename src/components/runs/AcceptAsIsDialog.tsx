"use client";

import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { acceptErrorMessage, isReasonWritten } from "@/lib/runs/sessionAccept";
import { acceptAsIs } from "@/lib/runs/sessionControlApi";
import type { SessionAcceptResponse, SessionDetail } from "@/types/measurement";

/**
 * Terima apa adanya (PBI-12 AC9): Admin menganggap sesi dengan kegagalan teknis selesai
 * sepenuhnya, dengan alasan tertulis. Tombol baru aktif setelah alasan berisi sesuatu yang
 * terbaca; server tetap memeriksa ulang (422 REASON_REQUIRED).
 */
export function AcceptAsIsDialog({
  session,
  onAccepted,
  onClose,
}: Readonly<{
  session: Pick<SessionDetail, "id" | "label">;
  onAccepted: (record: SessionAcceptResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const reasonId = useId();
  const [reason, setReason] = useState("");

  return (
    <ConfirmDialog
      title="Terima sesi apa adanya?"
      confirmLabel="Terima apa adanya"
      busyLabel="Menyimpan…"
      confirmDisabled={!isReasonWritten(reason)}
      onConfirm={() => acceptAsIs(session.id, reason)}
      errorMessage={acceptErrorMessage}
      onDone={onAccepted}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        Sesi “{session.label}” dianggap selesai sepenuhnya walau ada percobaan yang gagal teknis. Selama
        tanda ini ada, sesi tidak bisa dicoba ulang.
      </p>
      <label htmlFor={reasonId} className="mt-4 block text-sm font-medium text-slate-900">
        Alasan
      </label>
      <textarea
        id={reasonId}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        required
        rows={3}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
    </ConfirmDialog>
  );
}
