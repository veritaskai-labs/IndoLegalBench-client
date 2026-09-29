"use client";

import { useState } from "react";
import { setProductActive } from "@/lib/providers/providerApi";
import type { AiProduct } from "@/types/provider";

type Props = {
  product: AiProduct;
  onClose: () => void;
  onDone: (saved: AiProduct) => void;
};

/** Konfirmasi aktifkan/nonaktifkan produk AI (SCRUM-117, AC4). */
export function ToggleActiveDialog({ product, onClose, onDone }: Props) {
  const activating = !product.is_active;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const title = activating ? "Aktifkan produk AI" : "Nonaktifkan produk AI";

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      onDone(await setProductActive(product.id, activating));
    } catch {
      setError(`Gagal ${activating ? "mengaktifkan" : "menonaktifkan"} produk. Coba lagi.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-3 text-sm text-slate-600">
          {activating
            ? `${product.name} bisa dipilih lagi untuk pengukuran baru.`
            : `${product.name} tidak bisa dipilih untuk pengukuran baru. Riwayat pengukurannya tetap tersimpan dan produknya tetap bisa dibuka.`}
        </p>
        {error && (
          <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${activating ? "bg-slate-900 hover:bg-slate-800" : "bg-red-700 hover:bg-red-800"}`}
          >
            {activating ? "Aktifkan" : "Nonaktifkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
