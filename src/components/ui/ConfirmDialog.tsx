"use client";

import { type ReactNode, useId, useRef, useState } from "react";
import { CHROME } from "@/lib/i18n/chrome";
import { useText } from "@/lib/i18n/LocaleProvider";
import { Button } from "./Button";

/**
 * Callback ref: buka sebagai modal saat dialog dipasang. React memanggilnya lagi dengan null
 * saat dialog dilepas. jsdom belum punya showModal, jadi atribut open dipasang sendiri.
 */
export function openAsModal(dialog: HTMLDialogElement | null) {
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
  dismissLabel,
  confirmDisabled = false,
  destructive = false,
  onConfirm,
  errorMessage,
  onDone,
  onClose,
}: Readonly<{
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  /** Tombol keluar sebelum ada error. "Kembali" bila "Batal" terbaca seperti aksinya (Batalkan sesi). */
  dismissLabel?: string;
  /** Aksi belum boleh dijalankan, misalnya alasan wajib belum diisi. */
  confirmDisabled?: boolean;
  /** Aksi berisiko (hapus, nonaktifkan, batalkan sesi): tombol konfirmasi tampil merah. */
  destructive?: boolean;
  onConfirm: () => Promise<T>;
  errorMessage: (failure: unknown) => string;
  onDone: (result: T) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const chrome = useText(CHROME);
  const titleId = useId();
  const dismiss = dismissLabel ?? chrome.cancel;
  const confirming = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (confirming.current) return;
    confirming.current = true;
    setBusy(true);
    setError(null);
    try {
      onDone(await onConfirm());
    } catch (failure) {
      confirming.current = false;
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  function close() {
    if (!confirming.current) onClose(error !== null);
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
      className="m-auto w-[calc(100%-2rem)] max-w-[520px] rounded-dialog bg-paper p-6 text-ink shadow-dialog backdrop:bg-ink/40"
    >
      <h2 id={titleId} className="font-serif text-[22px] font-medium leading-7">
        {title}
      </h2>
      {children}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={close} disabled={busy}>
          {error ? chrome.close : dismiss}
        </Button>
        <Button
          variant={destructive ? "danger" : "primary"}
          onClick={confirm}
          disabled={busy || confirmDisabled}
        >
          {busy ? busyLabel : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
