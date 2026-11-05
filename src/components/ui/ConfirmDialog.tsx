"use client";

import { type ReactNode, useId, useState } from "react";

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
 * Dialog konfirmasi untuk aksi yang memanggil server (Arsipkan, Batalkan, Terima apa adanya).
 *
 * Selama onConfirm berjalan kedua tombol dan Escape terkunci, jadi klik ganda tidak mengirim dua
 * kali dan hasilnya tidak hilang. Kalau server menolak, alasannya tampil di sini dan aksi boleh
 * dicoba lagi; onClose(true) memberi tahu pemanggil bahwa datanya mungkin sudah tidak sesuai server.
 * Isi dialog (teks konsekuensi, isian alasan) datang dari pemanggil lewat children, dan hasil
 * onConfirm (misalnya balasan server) diteruskan ke onDone.
 */
export function ConfirmDialog<T>({
  title,
  children,
  confirmLabel,
  busyLabel,
  confirmDisabled = false,
  onConfirm,
  errorMessage,
  onDone,
  onClose,
}: Readonly<{
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  /** Aksi belum boleh dijalankan, misalnya alasan wajib belum diisi. */
  confirmDisabled?: boolean;
  onConfirm: () => Promise<T>;
  errorMessage: (failure: unknown) => string;
  onDone: (result: T) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      onDone(await onConfirm());
    } catch (failure) {
      setError(errorMessage(failure));
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
        // Escape: dialog native ditutup lewat state pemanggil, bukan oleh browser.
        event.preventDefault();
        close();
      }}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id={titleId} className="text-base font-medium">
        {title}
      </h2>
      {children}
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
          disabled={busy || confirmDisabled}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
