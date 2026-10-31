"use client";

import { useEffect, useRef } from "react";

import type { MeasurementType } from "./MeasurementTypeField";

const TYPE_LABEL: Record<MeasurementType, string> = {
  automatic: "Otomatis",
  manual: "Manual",
};

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

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    // jsdom belum menjalankan showModal, jadi atribut open dipasang sendiri
    // supaya peringatan ini tetap terbaca sebagai dialog saat diuji.
    if (!dialog.open) dialog.setAttribute("open", "");
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="save-type-warning-title"
      className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id="save-type-warning-title" className="text-base font-medium">
        Simpan sebagai produk {TYPE_LABEL[measurementType]}?
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-600">
        Jenis pengukuran tidak bisa diubah lagi setelah produk punya riwayat
        pengukuran. Uji koneksi tidak dihitung.
      </p>
      {switching && (
        <p className="mt-2 max-w-sm text-sm text-slate-600">
          Isian jenis sebelumnya akan hilang setelah disimpan.
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
        >
          Ya, simpan
        </button>
      </div>
    </dialog>
  );
}