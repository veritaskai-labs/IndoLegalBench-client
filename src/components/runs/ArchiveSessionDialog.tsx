"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { archiveSession } from "@/lib/runs/runsApi";
import { archiveErrorMessage } from "@/lib/runs/sessionRules";
import type { SessionListItem } from "@/types/measurement";

const COPY = messages({
  id: {
    title: "Arsipkan sesi?",
    confirm: "Arsipkan",
    busy: "Mengarsipkan…",
    body: "Sesi “{label}” disembunyikan dari daftar. Datanya tidak dihapus dan tetap tersimpan.",
  },
  en: {
    title: "Archive session?",
    confirm: "Archive",
    busy: "Archiving…",
    body: "Session “{label}” is hidden from the list. Its data is not deleted and stays stored.",
  },
});

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
  const copy = useText(COPY);
  const locale = useLocale();
  return (
    <ConfirmDialog
      title={copy.title}
      confirmLabel={copy.confirm}
      busyLabel={copy.busy}
      onConfirm={async () => {
        await archiveSession(session.id);
      }}
      errorMessage={(error) => archiveErrorMessage(error, locale)}
      onDone={onArchived}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">{fill(copy.body, { label: session.label })}</p>
    </ConfirmDialog>
  );
}
