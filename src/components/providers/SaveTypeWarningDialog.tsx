"use client";

import { useEffect, useRef } from "react";

import { CHROME } from "@/lib/i18n/chrome";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";

import type { MeasurementType } from "./MeasurementTypeField";

const COPY = messages({
  id: {
    titleAutomatic: "Simpan sebagai produk Otomatis?",
    titleManual: "Simpan sebagai produk Manual?",
    body: "Jenis pengukuran tidak bisa diubah lagi setelah produk punya riwayat pengukuran. Uji koneksi tidak dihitung.",
    switching: "Isian jenis sebelumnya akan hilang setelah disimpan.",
    confirm: "Ya, simpan",
  },
  en: {
    titleAutomatic: "Save as an Automatic product?",
    titleManual: "Save as a Manual product?",
    body: "The measurement type cannot be changed after the product has measurement history. A connection test does not count.",
    switching: "The values from the previous type will be lost once this is saved.",
    confirm: "Yes, save",
  },
});

/** AC3: peringatan sebelum produk baru pertama kali tersimpan. */
export function SaveTypeWarningDialog({
  measurementType,
  switching = false,
  onConfirm,
  onCancel,
}: Readonly<{
  measurementType: MeasurementType;
  /** AC4: jenisnya diganti dari jenis yang tersimpan, bukan produk baru. */
  switching?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const title = measurementType === "automatic" ? copy.titleAutomatic : copy.titleManual;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    // jsdom belum menjalankan showModal, jadi atribut open dipasang sendiri
    // supaya peringatan ini tetap terbaca sebagai dialog saat diuji.
    if (!dialog.open) dialog.setAttribute("open", "");
  }, []);

  // m-auto: Tailwind's preflight sets margin 0, which drops the browser's centring of a
  // modal <dialog> and leaves it in the top-left corner.
  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="save-type-warning-title"
      className="m-auto rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id="save-type-warning-title" className="text-base font-medium">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-600">{copy.body}</p>
      {switching && <p className="mt-2 max-w-sm text-sm text-slate-600">{copy.switching}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          {chrome.cancel}
        </button>
        <button type="button" onClick={onConfirm} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
          {copy.confirm}
        </button>
      </div>
    </dialog>
  );
}
