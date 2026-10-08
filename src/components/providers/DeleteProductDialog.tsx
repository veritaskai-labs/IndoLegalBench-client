"use client";

import { useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { deleteProduct } from "@/lib/providers/providerApi";
import type { AiProduct } from "@/types/provider";

type Props = {
  product: AiProduct;
  onClose: () => void;
  onDone: () => void;
};

/** Konfirmasi hapus produk AI (SCRUM-134 #2). Soft delete: riwayat pengukuran tetap ada. */
export function DeleteProductDialog({ product, onClose, onDone }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      await deleteProduct(product.id);
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "Produk ini sudah tidak ada, mungkin sudah dihapus admin lain. Muat ulang halaman untuk melihat daftar terbaru."
          : "Produk gagal dihapus. Tunggu sebentar, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-label="Hapus produk AI" className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-slate-900">Hapus {product.name}?</h2>
        <p className="mt-3 text-sm text-slate-600">
          Produk ini akan hilang dari daftar Aktif maupun Nonaktif dan tidak bisa dipilih untuk pengukuran baru. Riwayat
          pengukuran dan laporan yang sudah memakai produk ini tetap tersimpan.
        </p>
        <p className="mt-2 text-sm text-slate-600">Kalau hanya ingin berhenti memakainya sementara, pilih Nonaktifkan.</p>
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
            className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {busy ? "Menghapus…" : "Hapus produk"}
          </button>
        </div>
      </div>
    </div>
  );
}
