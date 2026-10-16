"use client";

import { useCreateSnapshot } from "@/hooks/useCreateSnapshot";
import type { SnapshotRead } from "@/types/snapshot";

type Props = {
  suiteId: string;
  onClose: () => void;
  onCreated: (snapshot: SnapshotRead) => void;
};

/** Konfirmasi saja, tanpa form nama: snapshot dinamai otomatis dengan waktu pembuatannya. */
export function CreateSnapshotDialog({ suiteId, onClose, onCreated }: Props) {
  const { create, pending, error } = useCreateSnapshot(suiteId, onCreated);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buat snapshot"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="text-base font-semibold text-slate-900">Buat snapshot</h2>

        <p className="mt-3 text-sm text-slate-600">
          Snapshot membekukan semua kasus yang sudah disetujui di suite ini pada saat ini. Isinya
          tidak ikut berubah saat kasus diedit, dan namanya otomatis berupa waktu pembuatannya.
        </p>

        {error !== null && (
          <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void create()}
            disabled={pending}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "Membuat…" : "Buat snapshot"}
          </button>
        </div>
      </div>
    </div>
  );
}
