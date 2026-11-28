"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { acceptErrorMessage } from "@/lib/runs/sessionAccept";
import { clearAcceptAsIs } from "@/lib/runs/sessionControlApi";
import type { SessionAcceptResponse, SessionDetail } from "@/types/measurement";

const COPY = messages({
  id: {
    title: "Hapus tanda terima apa adanya?",
    confirm: "Hapus tanda",
    busy: "Menghapus…",
    body: "Sesi “{label}” tidak lagi dianggap selesai sepenuhnya dan bisa dicoba ulang lagi.",
  },
  en: {
    title: "Remove the accepted-as-is mark?",
    confirm: "Remove mark",
    busy: "Removing…",
    body: "Session “{label}” is no longer treated as fully finished and can be retried again.",
  },
});

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
  const copy = useText(COPY);
  const locale = useLocale();
  return (
    <ConfirmDialog
      title={copy.title}
      confirmLabel={copy.confirm}
      busyLabel={copy.busy}
      onConfirm={() => clearAcceptAsIs(session.id)}
      errorMessage={(error) => acceptErrorMessage(error, locale)}
      onDone={onCleared}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">{fill(copy.body, { label: session.label })}</p>
    </ConfirmDialog>
  );
}
