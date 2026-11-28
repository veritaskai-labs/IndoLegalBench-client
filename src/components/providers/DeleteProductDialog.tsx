"use client";

import { useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { CHROME } from "@/lib/i18n/chrome";
import { useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { deleteProduct } from "@/lib/providers/providerApi";
import type { AiProduct } from "@/types/provider";

type Props = {
  product: AiProduct;
  onClose: () => void;
  onDone: () => void;
};

const COPY = messages({
  id: {
    aria: "Hapus produk AI",
    title: "Hapus {name}?",
    body: "Produk ini akan hilang dari daftar Aktif maupun Nonaktif dan tidak bisa dipilih untuk pengukuran baru. Riwayat pengukuran dan laporan yang sudah memakai produk ini tetap tersimpan.",
    pause: "Kalau hanya ingin berhenti memakainya sementara, pilih Nonaktifkan.",
    gone: "Produk ini sudah tidak ada, mungkin sudah dihapus admin lain. Muat ulang halaman untuk melihat daftar terbaru.",
    failed: "Produk gagal dihapus. Tunggu sebentar, lalu coba lagi.",
    deleting: "Menghapus…",
    confirm: "Hapus produk",
  },
  en: {
    aria: "Delete AI product",
    title: "Delete {name}?",
    body: "This product will disappear from both the Active and Inactive lists and cannot be chosen for a new measurement. Measurement history and reports that already use this product stay stored.",
    pause: "To stop using it for a while, choose Deactivate.",
    gone: "This product is already gone. Another admin may have deleted it. Reload the page to see the current list.",
    failed: "The product could not be deleted. Wait a moment, then try again.",
    deleting: "Deleting…",
    confirm: "Delete product",
  },
});

/** Konfirmasi hapus produk AI (SCRUM-134 #2). Soft delete: riwayat pengukuran tetap ada. */
export function DeleteProductDialog({ product, onClose, onDone }: Readonly<Props>) {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      await deleteProduct(product.id);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? copy.gone : copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-label={copy.aria} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-slate-900">{fill(copy.title, { name: product.name })}</h2>
        <p className="mt-3 text-sm text-slate-600">{copy.body}</p>
        <p className="mt-2 text-sm text-slate-600">{copy.pause}</p>
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
            className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {busy ? copy.deleting : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
