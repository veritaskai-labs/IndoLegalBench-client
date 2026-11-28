"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { unarchiveSession } from "@/lib/runs/runsApi";
import { unarchiveErrorMessage } from "@/lib/runs/sessionRules";
import type { SessionListItem } from "@/types/measurement";

const COPY = messages({
  id: {
    title: "Kembalikan sesi?",
    confirm: "Kembalikan",
    busy: "Mengembalikan…",
    body: "Sesi “{label}” kembali ke daftar utama; status dan datanya tidak berubah.",
  },
  en: {
    title: "Restore session?",
    confirm: "Restore",
    busy: "Restoring…",
    body: "Session “{label}” returns to the main list; its status and data do not change.",
  },
});

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
  const copy = useText(COPY);
  const locale = useLocale();
  return (
    <ConfirmDialog
      title={copy.title}
      confirmLabel={copy.confirm}
      busyLabel={copy.busy}
      onConfirm={async () => {
        await unarchiveSession(session.id);
      }}
      errorMessage={(error) => unarchiveErrorMessage(error, locale)}
      onDone={onUnarchived}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">{fill(copy.body, { label: session.label })}</p>
    </ConfirmDialog>
  );
}
