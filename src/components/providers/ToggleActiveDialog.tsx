"use client";

import { useState } from "react";
import { CHROME } from "@/lib/i18n/chrome";
import { useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { setProductActive } from "@/lib/providers/providerApi";
import type { AiProduct } from "@/types/provider";

type Props = {
  product: AiProduct;
  onClose: () => void;
  onDone: (saved: AiProduct) => void;
};

const COPY = messages({
  id: {
    activateTitle: "Aktifkan produk AI",
    deactivateTitle: "Nonaktifkan produk AI",
    activateBody: "{name} bisa dipilih lagi untuk pengukuran baru.",
    deactivateBody:
      "{name} tidak bisa dipilih untuk pengukuran baru. Riwayat pengukurannya tetap tersimpan dan produknya tetap bisa dibuka.",
    activateFailed: "Gagal mengaktifkan produk. Coba lagi.",
    deactivateFailed: "Gagal menonaktifkan produk. Coba lagi.",
    activate: "Aktifkan",
    deactivate: "Nonaktifkan",
  },
  en: {
    activateTitle: "Activate AI product",
    deactivateTitle: "Deactivate AI product",
    activateBody: "{name} can be chosen again for a new measurement.",
    deactivateBody:
      "{name} cannot be chosen for a new measurement. Its measurement history stays stored and the product can still be opened.",
    activateFailed: "Could not activate the product. Try again.",
    deactivateFailed: "Could not deactivate the product. Try again.",
    activate: "Activate",
    deactivate: "Deactivate",
  },
});

/** Konfirmasi aktifkan/nonaktifkan produk AI (SCRUM-117, AC4). */
export function ToggleActiveDialog({ product, onClose, onDone }: Readonly<Props>) {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const activating = !product.is_active;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const title = activating ? copy.activateTitle : copy.deactivateTitle;

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      onDone(await setProductActive(product.id, activating));
    } catch {
      setError(activating ? copy.activateFailed : copy.deactivateFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-3 text-sm text-slate-600">
          {fill(activating ? copy.activateBody : copy.deactivateBody, { name: product.name })}
        </p>
        {error && (
          <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {chrome.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${activating ? "bg-slate-900 hover:bg-slate-800" : "bg-red-700 hover:bg-red-800"}`}
          >
            {activating ? copy.activate : copy.deactivate}
          </button>
        </div>
      </div>
    </div>
  );
}
