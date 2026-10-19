"use client";

import { useState } from "react";
import type { User } from "@/types/user-management";
import { adminErrorMessage } from "./errorMessage";

export interface MemberConfirmModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  /** Menerima anggota yang sedang dikonfirmasi, jadi pemanggil tidak perlu cek null. */
  onConfirm: (user: User) => Promise<void>;
}

interface MemberConfirmCopy {
  title: string;
  /** Teks sebelum dan sesudah "nama (email)" di kalimat pertanyaan. */
  questionBefore: string;
  questionAfter: string;
  note: string;
  confirmLabel: string;
  failureMessage: string;
  confirmClassName: string;
}

/** Kerangka bersama konfirmasi nonaktifkan dan aktifkan kembali anggota. */
export function MemberConfirmModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  title,
  questionBefore,
  questionAfter,
  note,
  confirmLabel,
  failureMessage,
  confirmClassName,
}: Readonly<MemberConfirmModalProps & MemberConfirmCopy>) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      await onConfirm(user);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(adminErrorMessage(err, failureMessage));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-slate-100 text-center">
        <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          {questionBefore}
          <span className="font-semibold text-slate-900">{user.name}</span> ({user.email})
          {questionAfter}
        </p>

        <p className="text-[11px] text-slate-500 mb-6 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-left">
          {note}
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
            className={`w-1/2 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50 ${confirmClassName}`}
          >
            {isProcessing ? "Memproses…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
