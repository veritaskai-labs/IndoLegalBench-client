"use client";

import { useState } from "react";

import { archiveSession } from "@/lib/runs/runsApi";
import { archiveErrorMessage } from "@/lib/runs/sessionRules";
import type { SessionListItem } from "@/types/measurement";

/**
 * Callback ref: buka sebagai modal saat dialog dipasang. React memanggilnya lagi dengan null
 * saat dialog dilepas. jsdom belum punya showModal, jadi atribut open dipasang sendiri.
 */
function openAsModal(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

/**
 * Konfirmasi Arsipkan (PBI-11 AC10): sesi disembunyikan dari daftar, datanya tetap ada.
 * Kalau server menolak, alasannya tampil di sini; onClose(true) memberi tahu halaman bahwa
 * daftarnya mungkin sudah tidak sesuai server, jadi perlu dimuat ulang.
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tombol Arsipkan nonaktif selama permintaan berjalan, jadi klik ganda tidak mengirim dua kali.
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await archiveSession(session.id);
      onArchived();
    } catch (failure) {
      setError(archiveErrorMessage(failure));
      setBusy(false);
    }
  }

  function close() {
    if (!busy) onClose(error !== null);
  }

  return (
    <dialog
      ref={openAsModal}
      onCancel={(event) => {
        // Escape: dialog native ditutup lewat state halaman, bukan oleh browser.
        event.preventDefault();
        close();
      }}
      aria-labelledby="archive-session-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id="archive-session-title" className="text-base font-medium">
        Arsipkan sesi?
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Sesi “{session.label}” disembunyikan dari daftar. Datanya tidak dihapus dan tetap tersimpan.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          disabled={busy}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
        >
          {error ? "Tutup" : "Batal"}
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Mengarsipkan…" : "Arsipkan"}
        </button>
      </div>
    </dialog>
  );
}
