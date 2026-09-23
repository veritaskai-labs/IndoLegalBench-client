"use client";

import { useState } from "react";
import type { User } from "@/types/user-management";
import { adminErrorMessage } from "./errorMessage";

interface DeactivateConfirmModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeactivateConfirmModal({
  user,
  isOpen,
  onClose,
  onConfirm,
}: DeactivateConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(adminErrorMessage(err, "Gagal menonaktifkan akun."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-slate-100 text-center">
        <h3 className="text-base font-bold text-slate-900 mb-2">Nonaktifkan Pengguna?</h3>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Apakah Anda yakin ingin menonaktifkan akun{" "}
          <span className="font-semibold text-slate-900">{user.name}</span> ({user.email})?
        </p>

        <p className="text-[11px] text-slate-500 mb-6 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-left">
          Akun tidak akan dapat masuk kembali dan seluruh sesi aktifnya akan dihapus. Riwayat kontribusi kasus dan tinjauan tetap tercatat atas nama pengguna ini.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200 text-left"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-1/2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-1/2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? "Memproses…" : "Nonaktifkan"}
          </button>
        </div>
      </div>
    </div>
  );
}